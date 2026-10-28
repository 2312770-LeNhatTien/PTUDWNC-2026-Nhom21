using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Infrastructure.Services;

// Mọi ảnh mới đi qua server: xác minh bytes trước khi cấp URL công khai.
public class MinioFileStorageService : IFileStorageService
{
    public const long MaxFileSizeBytes = 5 * 1024 * 1024;
    private readonly IAmazonS3 _s3;
    private readonly ICurrentUser _user;
    private readonly ILogger<MinioFileStorageService> _logger;
    private readonly string _bucket;
    private readonly Uri _origin;
    private readonly HashSet<string> _initialized = new(StringComparer.Ordinal);
    private static readonly Dictionary<string, string> Extensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/avif"] = ".avif"
    };

    public MinioFileStorageService(IAmazonS3 s3, IConfiguration configuration,
        ILogger<MinioFileStorageService> logger, ICurrentUser user)
    {
        _s3 = s3;
        _user = user;
        _logger = logger;
        _bucket = configuration["MinIO:Bucket"] ?? "culinary-blog";
        _origin = new Uri(configuration["MinIO:PublicUrl"] ??
            $"http{(configuration.GetValue<bool>("MinIO:UseSSL") ? "s" : "")}://{configuration["MinIO:Endpoint"] ?? "localhost:9000"}");
    }

    public async Task<string> UploadAsync(Stream content, string fileName, string contentType,
        string folder, CancellationToken ct = default)
    {
        if (!_user.IsAuthenticated || !Guid.TryParse(_user.UserId, out var owner))
            throw new UnauthorizedException("Vui lòng đăng nhập trước khi tải ảnh.");
        if (!Extensions.TryGetValue(contentType, out var extension))
            throw new ValidationException("FILE_MIME_INVALID", "Chỉ nhận JPEG, PNG, WebP và AVIF.");

        using var validated = await ReadBoundedAsync(content, ct);
        ValidateSignature(validated.ToArray(), contentType);
        using var verified = ImageSafety.ReadVerified(validated, contentType);
        // Owner nằm trong key do server cấp, client không được chọn user/bucket tùy ý.
        var purpose = "recipes";
        if (folder.Equals("avatars", StringComparison.OrdinalIgnoreCase)) purpose = "avatars";
        else if (folder.Contains("steps", StringComparison.OrdinalIgnoreCase)) purpose = "steps";
        var key = $"users/{owner:D}/{purpose}/{Guid.NewGuid():N}{extension}";
        return await PutAsync(validated, contentType, _bucket, key, ct);
    }

    public async Task EnsureOwnedUploadAsync(string fileUrl, CancellationToken ct = default)
    {
        if (!_user.IsAuthenticated || !Guid.TryParse(_user.UserId, out var owner))
            throw new UnauthorizedException("Vui lòng đăng nhập.");
        var (bucket, key) = ParseManagedUrl(fileUrl);
        var parts = key.Split('/');
        if (bucket != _bucket || parts.Length != 4 || parts[0] != "users" ||
            !Guid.TryParse(parts[1], out _) || (!_user.IsAdmin && parts[1] != owner.ToString("D")) ||
            parts[2] is not ("recipes" or "avatars" or "steps") ||
            !Guid.TryParseExact(Path.GetFileNameWithoutExtension(parts[3]), "N", out _))
            throw new ForbiddenException("Ảnh không thuộc quyền quản lý của bạn.");
        // Chỉ object đã được upload thành công qua server mới được gắn vào bài/profile.
        GetObjectMetadataResponse metadata;
        try { metadata = await _s3.GetObjectMetadataAsync(bucket, key, ct); }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            throw new ValidationException("FILE_NOT_FOUND", "Ảnh chưa được tải lên hoặc đã bị xóa. Vui lòng tải lại ảnh.");
        }
        if (metadata.ContentLength <= 0 || metadata.ContentLength > MaxFileSizeBytes)
            throw new ValidationException("FILE_INVALID", "Ảnh không hợp lệ.");
    }

    public IReadOnlyList<string> GetGeneratedImageUrls(Guid recipeId, Guid imageId)
        => new[] { "300x300", "800x600" }.Select(size =>
            $"{_origin.GetLeftPart(UriPartial.Authority)}/recipe-thumbnails/recipes/{recipeId}/{recipeId}_{imageId}_{size}.webp").ToArray();

    public Task<string> UploadToBucketAsync(Stream content, string fileName, string contentType,
        string bucketName, string? folder = null, CancellationToken ct = default)
    {
        if (bucketName != "recipe-thumbnails" || Path.GetFileName(fileName) != fileName ||
            string.IsNullOrEmpty(folder) || !folder.StartsWith("recipes/", StringComparison.Ordinal) ||
            !Guid.TryParse(folder["recipes/".Length..], out _))
            throw new ValidationException("FILE_KEY_INVALID", "Đường dẫn ảnh sinh tự động không hợp lệ.");
        // Key ổn định giúp retry ghi đè đúng phiên bản, không sinh thêm object rác.
        return PutAsync(content, contentType, bucketName, $"{folder}/{fileName}", ct);
    }

    public async Task<(Stream Stream, long Length, string ContentType)> DownloadFileAsync(
        string fileUrl, CancellationToken ct = default)
    {
        var (bucket, key) = ParseManagedUrl(fileUrl);
        // Không có HTTP fallback: URL do người dùng nhập không được dùng để gọi mạng nội bộ.
        using var response = await _s3.GetObjectAsync(bucket, key, ct);
        if (response.ContentLength > MaxFileSizeBytes)
            throw new ValidationException("FILE_TOO_LARGE", "Ảnh vượt giới hạn 5 MB.");
        var data = await ReadBoundedAsync(response.ResponseStream, ct);
        return (data, data.Length, response.Headers.ContentType ?? "application/octet-stream");
    }

    public async Task DeleteAsync(string fileUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return;
        (string bucket, string key) managed;
        try { managed = ParseManagedUrl(fileUrl); }
        catch (ValidationException ex) when (ex.Errors.ContainsKey("FILE_SOURCE_INVALID"))
        {
            // Bản ghi cũ có thể dùng ảnh bên ngoài; hệ thống chỉ dọn object mình quản lý.
            return;
        }
        var (bucket, key) = managed;
        await _s3.DeleteObjectAsync(new DeleteObjectRequest { BucketName = bucket, Key = key }, ct);
    }

    private (string Bucket, string Key) ParseManagedUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            uri.Scheme != _origin.Scheme || uri.Authority != _origin.Authority ||
            !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment) ||
            !string.IsNullOrEmpty(uri.UserInfo))
            throw new ValidationException("FILE_SOURCE_INVALID", "Chỉ được sử dụng ảnh lưu trên hệ thống.");
        var segments = Uri.UnescapeDataString(uri.AbsolutePath).Trim('/').Split('/');
        if (segments.Length < 2 || (segments[0] != _bucket && segments[0] != "recipe-thumbnails") ||
            segments.Any(s => s is "" or "." or ".." || s.Contains('\\')))
            throw new ValidationException("FILE_KEY_INVALID", "Bucket hoặc object key không hợp lệ.");
        return (segments[0], string.Join('/', segments.Skip(1)));
    }

    private async Task<string> PutAsync(Stream content, string contentType, string bucket, string key, CancellationToken ct)
    {
        if (!_initialized.Contains(bucket) && !await AmazonS3Util.DoesS3BucketExistV2Async(_s3, bucket))
        {
            await _s3.PutBucketAsync(new PutBucketRequest { BucketName = bucket }, ct);
            await _s3.PutBucketPolicyAsync(new PutBucketPolicyRequest
            {
                BucketName = bucket,
                Policy = $$"""{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::{{bucket}}/*"]}]}"""
            }, ct);
        }
        _initialized.Add(bucket);
        if (content.CanSeek) content.Position = 0;
        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = bucket,
            Key = key,
            ContentType = contentType,
            InputStream = content,
            AutoCloseStream = false
        }, ct);
        _logger.LogInformation("Lưu ảnh vào {Bucket}/{Key}", bucket, key);
        return $"{_origin.GetLeftPart(UriPartial.Authority)}/{bucket}/{key}";
    }

    private static async Task<MemoryStream> ReadBoundedAsync(Stream source, CancellationToken ct)
    {
        var result = new MemoryStream();
        try
        {
            var buffer = new byte[81920];
            int count;
            while ((count = await source.ReadAsync(buffer, ct)) > 0)
            {
                if (result.Length + count > MaxFileSizeBytes)
                    throw new ValidationException("FILE_TOO_LARGE", "Ảnh vượt giới hạn 5 MB.");
                await result.WriteAsync(buffer.AsMemory(0, count), ct);
            }
            if (result.Length == 0) throw new ValidationException("FILE_EMPTY", "Tệp ảnh không được rỗng.");
            result.Position = 0;
            return result;
        }
        catch { await result.DisposeAsync(); throw; }
    }

    private static void ValidateSignature(byte[] bytes, string type)
    {
        var valid = bytes.Length >= 12 && (type.ToLowerInvariant() switch
        {
            "image/jpeg" => bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255,
            "image/png" => bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
            "image/webp" => System.Text.Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF" &&
                System.Text.Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP",
            "image/avif" => System.Text.Encoding.ASCII.GetString(bytes, 4, 4) == "ftyp" &&
                (System.Text.Encoding.ASCII.GetString(bytes, 8, 4) is "avif" or "avis"),
            _ => false
        });
        if (!valid) throw new ValidationException("FILE_SIGNATURE_MISMATCH", "Nội dung ảnh không khớp định dạng đã khai báo.");
    }
}
