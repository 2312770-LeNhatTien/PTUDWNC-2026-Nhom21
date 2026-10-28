namespace CulinaryBlog.Application.Common.Interfaces;

// SRS mục 3.5 (FR-FILE) - abstraction cho object storage, cho phép đổi
// implementation (MinIO <-> AWS S3 <-> local filesystem) mà không sửa
// tầng Application.
// CONS-007: tối đa 5MB, chỉ nhận image/jpeg, image/png, image/webp, image/avif.
public interface IFileStorageService
{
    // Xác minh object do server cấp và người gọi sở hữu trước khi attach/xóa.
    Task EnsureOwnedUploadAsync(string fileUrl, CancellationToken ct = default);
    IReadOnlyList<string> GetGeneratedImageUrls(Guid recipeId, Guid imageId);
    // Trả về public URL của file sau khi upload qua stream server.
    Task<string> UploadAsync(Stream content, string fileName, string contentType,
        string folder, CancellationToken ct = default);

    // Upload file lên bucket cụ thể (ví dụ 'recipe-thumbnails' cho FR-JOB-002)
    Task<string> UploadToBucketAsync(
        Stream content,
        string fileName,
        string contentType,
        string bucketName,
        string? folder = null,
        CancellationToken ct = default);

    // Chỉ đọc object thuộc bucket và origin do hệ thống quản lý, không tải URL ngoài.
    Task<(Stream Stream, long Length, string ContentType)> DownloadFileAsync(
        string fileUrl,
        CancellationToken ct = default);

    // Idempotent: object không tồn tại thì bỏ qua, không ném exception.
    Task DeleteAsync(string fileUrl, CancellationToken ct = default);
}
