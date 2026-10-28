using CulinaryBlog.Application.Common.Models;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Infrastructure.Services;

/// <summary>
/// FR-FILE-001: Upload ảnh lên MinIO S3-compatible.
/// FR-FILE-002: Xóa ảnh khỏi MinIO (idempotent).
/// FR-FILE-003: Sinh Presigned Upload URL an toàn không lộ Secret Key.
/// FR-JOB-002: Hỗ trợ lưu trữ thumbnail và tải dữ liệu ảnh xử lý nền.
/// Tuân thủ CONS-007: Giới hạn 5MB, MIME type hợp lệ, kiểm tra magic bytes.
/// </summary>
public class MinioFileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MinioFileStorageService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _bucketName;
    private readonly string _publicEndpoint;
    private readonly bool _useSsl;
    private readonly HashSet<string> _initializedBuckets = new(StringComparer.OrdinalIgnoreCase);
    private readonly SemaphoreSlim _initLock = new(1, 1);

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif"
    };

    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB (CONS-007)

    public MinioFileStorageService(
        IAmazonS3 s3Client,
        IConfiguration configuration,
        ILogger<MinioFileStorageService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _s3Client = s3Client;
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
        _bucketName = configuration["MinIO:Bucket"] ?? "culinary-blog";

        var endpoint = configuration["MinIO:Endpoint"] ?? "localhost:9000";
        var useSsl = configuration.GetValue<bool>("MinIO:UseSSL");
        _useSsl = useSsl;
        _publicEndpoint = $"http{(useSsl ? "s" : "")}://{endpoint}";
    }

    public async Task<string> UploadAsync(
        Stream content,
        string fileName,
        string contentType,
        string folder,
        CancellationToken ct = default)
    {
        // 1. Kiểm tra bucket mặc định đã tồn tại chưa
        await EnsureBucketExistsAsync(_bucketName, ct);

        // 2. Validate định dạng MIME type và kích thước (CONS-007)
        ValidateFile(content, fileName, contentType);

        // 3. Sinh tên file duy nhất chống path traversal: {folder}/{uuid}{ext}
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = contentType.ToLowerInvariant() switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/avif" => ".avif",
                _ => ".jpg"
            };
        }

        var sanitizedFolder = folder.Trim('/', '\\');
        var objectKey = string.IsNullOrWhiteSpace(sanitizedFolder)
            ? $"{Guid.NewGuid():N}{ext}"
            : $"{sanitizedFolder}/{Guid.NewGuid():N}{ext}";

        // 4. Đưa Stream về vị trí 0 trước khi đẩy lên S3
        if (content.CanSeek)
        {
            content.Position = 0;
        }

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = objectKey,
            InputStream = content,
            ContentType = contentType,
            AutoCloseStream = false
        };

        try
        {
            await _s3Client.PutObjectAsync(putRequest, ct);
            _logger.LogInformation("FR-FILE-001: Upload thành công lên MinIO: {ObjectKey}", objectKey);
            return $"{_publicEndpoint}/{_bucketName}/{objectKey}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FR-FILE-001: Lỗi khi upload file lên MinIO: {ObjectKey}", objectKey);
            throw new InvalidOperationException("Không thể lưu trữ tệp tin vào máy chủ MinIO.", ex);
        }
    }

    public async Task<string> UploadToBucketAsync(
        Stream content,
        string fileName,
        string contentType,
        string bucketName,
        string? folder = null,
        CancellationToken ct = default)
    {
        await EnsureBucketExistsAsync(bucketName, ct);

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = contentType.ToLowerInvariant() switch
            {
                "image/webp" => ".webp",
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                _ => ".webp"
            };
        }

        var sanitizedFolder = folder?.Trim('/', '\\') ?? "";
        var objectKey = string.IsNullOrWhiteSpace(sanitizedFolder)
            ? $"{Guid.NewGuid():N}{ext}"
            : $"{sanitizedFolder}/{Guid.NewGuid():N}{ext}";

        if (content.CanSeek)
        {
            content.Position = 0;
        }

        var putRequest = new PutObjectRequest
        {
            BucketName = bucketName,
            Key = objectKey,
            InputStream = content,
            ContentType = contentType,
            AutoCloseStream = false
        };

        try
        {
            await _s3Client.PutObjectAsync(putRequest, ct);
            _logger.LogInformation("FR-JOB-002: Đã lưu trữ file vào bucket {BucketName}: {ObjectKey}", bucketName, objectKey);
            return $"{_publicEndpoint}/{bucketName}/{objectKey}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FR-JOB-002: Lỗi khi upload file vào bucket {BucketName}: {ObjectKey}", bucketName, objectKey);
            throw new InvalidOperationException($"Không thể lưu trữ tệp tin vào bucket {bucketName}.", ex);
        }
    }

    public async Task<(Stream Stream, long Length, string ContentType)> DownloadFileAsync(
        string fileUrl,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fileUrl))
        {
            throw new ArgumentException("URL tệp không được để trống.", nameof(fileUrl));
        }

        // Kiểm tra xem đây có phải là file lưu trên MinIO không
        if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
        {
            var segments = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length >= 2)
            {
                var bucket = segments[0];
                var objectKey = string.Join('/', segments.Skip(1));

                try
                {
                    var response = await _s3Client.GetObjectAsync(bucket, objectKey, ct);
                    var memStream = new MemoryStream();
                    await response.ResponseStream.CopyToAsync(memStream, ct);
                    memStream.Position = 0;
                    return (memStream, memStream.Length, response.Headers.ContentType ?? "image/jpeg");
                }
                catch (AmazonS3Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể đọc trực tiếp từ S3 {Bucket}/{Key}, thử fallback qua HTTP", bucket, objectKey);
                }
            }
        }

        // Tải qua HTTP (cho cả ảnh MinIO hoặc ảnh nguồn bên ngoài như Unsplash)
        try
        {
            var res = await _httpClient.GetAsync(fileUrl, ct);
            res.EnsureSuccessStatusCode();

            var memStream = new MemoryStream();
            await res.Content.CopyToAsync(memStream, ct);
            memStream.Position = 0;
            var contentType = res.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
            return (memStream, memStream.Length, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi tải ảnh từ URL: {Url}", fileUrl);
            throw new InvalidOperationException($"Không thể tải tệp ảnh từ {fileUrl}", ex);
        }
    }

    public async Task<PresignedUploadResult> GetPresignedUploadUrlAsync(
        string fileName,
        string contentType,
        string folder,
        TimeSpan? expiry = null,
        CancellationToken ct = default)
    {
        await EnsureBucketExistsAsync(_bucketName, ct);

        if (!AllowedMimeTypes.Contains(contentType))
        {
            throw new ValidationException("FILE_MIME_INVALID",
                $"Định dạng file '{contentType}' không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WebP, AVIF.");
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = contentType.ToLowerInvariant() switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/avif" => ".avif",
                _ => ".jpg"
            };
        }

        var sanitizedFolder = folder.Trim('/', '\\');
        var objectKey = string.IsNullOrWhiteSpace(sanitizedFolder)
            ? $"{Guid.NewGuid():N}{ext}"
            : $"{sanitizedFolder}/{Guid.NewGuid():N}{ext}";

        var duration = expiry ?? TimeSpan.FromMinutes(15);
        var preSignedRequest = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = objectKey,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.Add(duration),
            ContentType = contentType,
            Protocol = _useSsl ? Protocol.HTTPS : Protocol.HTTP
        };

        var uploadUrl = _s3Client.GetPreSignedURL(preSignedRequest);
        if (!_useSsl && uploadUrl.StartsWith("https://"))
        {
            uploadUrl = "http://" + uploadUrl[8..];
        }
        var publicUrl = $"{_publicEndpoint}/{_bucketName}/{objectKey}";

        _logger.LogInformation("FR-FILE-003: Đã sinh Presigned Upload URL cho {ObjectKey}, hết hạn sau {Minutes} phút",
            objectKey, duration.TotalMinutes);

        return new PresignedUploadResult(
            uploadUrl,
            publicUrl,
            objectKey,
            (int)duration.TotalMinutes);
    }

    public async Task DeleteAsync(string fileUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fileUrl))
        {
            return;
        }

        var (bucket, objectKey) = ExtractBucketAndKey(fileUrl);
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            return;
        }

        try
        {
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = bucket ?? _bucketName,
                Key = objectKey
            };

            await _s3Client.DeleteObjectAsync(deleteRequest, ct);
            _logger.LogInformation("FR-FILE-002: Đã xóa thành công file khỏi MinIO: {ObjectKey}", objectKey);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("FR-FILE-002: File không tồn tại trên MinIO, bỏ qua: {ObjectKey}", objectKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FR-FILE-002: Lỗi khi xóa file khỏi MinIO: {ObjectKey}", objectKey);
            throw;
        }
    }

    private (string? Bucket, string? Key) ExtractBucketAndKey(string fileUrl)
    {
        var path = fileUrl;
        if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
        {
            path = uri.AbsolutePath;
        }

        var segments = path.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 2)
        {
            return (segments[0], string.Join('/', segments.Skip(1)));
        }

        return (null, path.Trim('/'));
    }

    private async Task EnsureBucketExistsAsync(string bucketName, CancellationToken ct)
    {
        if (_initializedBuckets.Contains(bucketName))
        {
            return;
        }

        await _initLock.WaitAsync(ct);
        try
        {
            if (_initializedBuckets.Contains(bucketName))
            {
                return;
            }

            var exists = await AmazonS3Util.DoesS3BucketExistV2Async(_s3Client, bucketName);
            if (!exists)
            {
                _logger.LogInformation("Tạo bucket mới trên MinIO: {BucketName}", bucketName);
                await _s3Client.PutBucketAsync(new PutBucketRequest { BucketName = bucketName }, ct);

                // Cấu hình Bucket Policy Anonymous Read
                var policy = $$"""
                {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicRead",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": ["arn:aws:s3:::{{bucketName}}/*"]
                        }
                    ]
                }
                """;

                try
                {
                    await _s3Client.PutBucketPolicyAsync(new PutBucketPolicyRequest
                    {
                        BucketName = bucketName,
                        Policy = policy
                    }, ct);
                    _logger.LogInformation("Đã cấu hình policy Anonymous Read cho bucket {BucketName}", bucketName);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể cấu hình policy public-read cho bucket {BucketName}", bucketName);
                }
            }

            _initializedBuckets.Add(bucketName);
        }
        finally
        {
            _initLock.Release();
        }
    }

    private static void ValidateFile(Stream content, string fileName, string contentType)
    {
        if (content == null || content.Length == 0)
        {
            throw new ValidationException("FILE_EMPTY", "Tệp tin tải lên không được rỗng.");
        }

        if (content.Length > MaxFileSizeBytes)
        {
            throw new ValidationException("FILE_TOO_LARGE",
                $"Dung lượng tệp tin ({content.Length / 1024 / 1024:F2} MB) vượt quá giới hạn cho phép (5 MB).");
        }

        if (!AllowedMimeTypes.Contains(contentType))
        {
            throw new ValidationException("FILE_MIME_INVALID",
                $"Định dạng file '{contentType}' không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WebP, AVIF.");
        }

        ValidateMagicBytes(content, contentType);
    }

    private static void ValidateMagicBytes(Stream content, string contentType)
    {
        if (!content.CanSeek)
        {
            return;
        }

        var originalPosition = content.Position;
        content.Position = 0;

        var header = new byte[12];
        var bytesRead = content.Read(header, 0, header.Length);
        content.Position = originalPosition;

        if (bytesRead < 4)
        {
            throw new ValidationException("FILE_CORRUPTED", "Tệp tin bị hỏng hoặc không thể đọc.");
        }

        var isValid = contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
            "image/webp" => header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                            bytesRead >= 12 && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
            "image/avif" => bytesRead >= 12 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70,
            _ => true
        };

        if (!isValid)
        {
            throw new ValidationException("FILE_SIGNATURE_MISMATCH",
                "Chữ ký nhị phân (magic bytes) của tệp tin không khớp với định dạng được khai báo.");
        }
    }
}
