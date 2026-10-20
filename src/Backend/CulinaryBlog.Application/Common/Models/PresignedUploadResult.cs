namespace CulinaryBlog.Application.Common.Models;

/// <summary>
/// Kết quả sinh Presigned URL tải lên file trực tiếp từ Client (FR-FILE-003)
/// </summary>
/// <param name="UploadUrl">URL tải lên trực tiếp MinIO/S3 bằng HTTP PUT</param>
/// <param name="PublicUrl">URL công khai để truy cập/hiển thị ảnh sau khi upload</param>
/// <param name="ObjectKey">Đường dẫn định danh file trong bucket MinIO</param>
/// <param name="ExpiresInMinutes">Thời hạn sống của Presigned URL (mặc định 15 phút)</param>
public record PresignedUploadResult(
    string UploadUrl,
    string PublicUrl,
    string ObjectKey,
    int ExpiresInMinutes);
