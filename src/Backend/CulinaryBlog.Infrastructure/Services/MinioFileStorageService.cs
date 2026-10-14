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
/// Tuân thủ CONS-007: Giới hạn 5MB, MIME type hợp lệ, kiểm tra magic bytes.
/// </summary>
public class MinioFileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MinioFileStorageService> _logger;
    private readonly string _bucketName;
    private readonly string _publicEndpoint;
    private readonly bool _useSsl;
    private bool _bucketInitialized = false;
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
        ILogger<MinioFileStorageService> logger)
    {
        _s3Client = s3Client;
        _configuration = configuration;
        _logger = logger;
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
        // 1. Kiểm tra bucket đã tồn tại chưa
        await EnsureBucketExistsAsync(ct);

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

        // Đảm bảo stream ở vị trí ban đầu trước khi upload
        if (content.CanSeek)
        {
            content.Position = 0;
        }

        // 4. Upload lên MinIO qua AWS S3 SDK
        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = objectKey,
            InputStream = content,
            ContentType = contentType
        };

        await _s3Client.PutObjectAsync(putRequest, ct);

        var publicUrl = $"{_publicEndpoint}/{_bucketName}/{objectKey}";
        _logger.LogInformation("FR-FILE-001: Đã upload thành công file lên MinIO: {PublicUrl}", publicUrl);

        return publicUrl;
    }

    
    public async Task<PresignedUploadResult> GetPresignedUploadUrlAsync(
        string fileName,
        string contentType,
        string folder,
        TimeSpan? expiry = null,
        CancellationToken ct = default)
    {
        // 1. Kiểm tra bucket đã tồn tại chưa
        await EnsureBucketExistsAsync(ct);

        // 2. Validate MIME type
        if (!AllowedMimeTypes.Contains(contentType))
        {
            throw new ValidationException("FILE_MIME_INVALID",
                $"Định dạng file '{contentType}' không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WebP, AVIF.");
        }

        // 3. Sinh objectKey an toàn: {folder}/{uuid}{ext}
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

        // 4. Sinh Presigned PUT URL với thời hạn sống ngắn (mặc định 15 phút - SRS CONS-007 / Lab 6)
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

        var objectKey = ExtractObjectKey(fileUrl);
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            return;
        }

        try
        {
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            };

            await _s3Client.DeleteObjectAsync(deleteRequest, ct);
            _logger.LogInformation("FR-FILE-002: Đã xóa thành công file khỏi MinIO: {ObjectKey}", objectKey);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Idempotent: file không tồn tại thì bỏ qua, không ném exception (SRS mục 3.5)
            _logger.LogWarning("FR-FILE-002: File không tồn tại trên MinIO, bỏ qua: {ObjectKey}", objectKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FR-FILE-002: Lỗi khi xóa file khỏi MinIO: {ObjectKey}", objectKey);
            throw;
        }
    }

    private string ExtractObjectKey(string fileUrl)
    {
        // URL dạng: http://localhost:9000/culinary-blog/recipes/123/xyz.jpg hoặc /culinary-blog/recipes/123/xyz.jpg
        var path = fileUrl;
        if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
        {
            path = uri.AbsolutePath;
        }

        var bucketPrefix = $"/{_bucketName}/";
        if (path.StartsWith(bucketPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return path[bucketPrefix.Length..];
        }

        return path.TrimStart('/');
    }

    private void ValidateFile(Stream stream, string fileName, string contentType)
    {
        if (!AllowedMimeTypes.Contains(contentType))
        {
            throw new ValidationException("FILE_MIME_INVALID",
                $"Định dạng file '{contentType}' không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WebP, AVIF.");
        }

        if (stream.CanSeek && stream.Length > MaxFileSizeBytes)
        {
            throw new ValidationException("FILE_SIZE_EXCEEDED",
                $"Kích thước file vượt quá giới hạn 5MB ({stream.Length / (1024 * 1024.0):F2}MB).");
        }

        // Kiểm tra magic bytes
        if (stream.CanSeek && stream.Length >= 4)
        {
            var originalPos = stream.Position;
            var header = new byte[12];
            var bytesRead = stream.Read(header, 0, header.Length);
            stream.Position = originalPos;

            if (bytesRead >= 3)
            {
                var isJpeg = header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
                var isPng = bytesRead >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47;
                var isWebp = bytesRead >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                             && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50;

                // Nếu là một trong 3 định dạng phổ biến nhưng magic byte không khớp
                if (contentType.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase) && !isJpeg)
                {
                    throw new ValidationException("FILE_MIME_INVALID", "Nội dung file không đúng định dạng JPEG hợp lệ.");
                }
                if (contentType.Equals("image/png", StringComparison.OrdinalIgnoreCase) && !isPng)
                {
                    throw new ValidationException("FILE_MIME_INVALID", "Nội dung file không đúng định dạng PNG hợp lệ.");
                }
                if (contentType.Equals("image/webp", StringComparison.OrdinalIgnoreCase) && !isWebp)
                {
                    throw new ValidationException("FILE_MIME_INVALID", "Nội dung file không đúng định dạng WebP hợp lệ.");
                }
            }
        }
    }

    private async Task EnsureBucketExistsAsync(CancellationToken ct)
    {
        if (_bucketInitialized)
        {
            return;
        }

        await _initLock.WaitAsync(ct);
        try
        {
            if (_bucketInitialized)
            {
                return;
            }

            var exists = await AmazonS3Util.DoesS3BucketExistV2Async(_s3Client, _bucketName);
            if (!exists)
            {
                _logger.LogInformation("Tạo bucket mới trên MinIO: {BucketName}", _bucketName);
                await _s3Client.PutBucketAsync(new PutBucketRequest { BucketName = _bucketName }, ct);

                // Cấu hình policy public-read để truy cập ảnh trực tiếp qua URL
                var policyJson = $$"""
                {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": ["arn:aws:s3:::{{_bucketName}}/*"]
                        }
                    ]
                }
                """;

                try
                {
                    await _s3Client.PutBucketPolicyAsync(new PutBucketPolicyRequest
                    {
                        BucketName = _bucketName,
                        Policy = policyJson
                    }, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể cấu hình policy public-read cho bucket {BucketName}", _bucketName);
                }
            }

            _bucketInitialized = true;
        }
        finally
        {
            _initLock.Release();
        }
    }
}
