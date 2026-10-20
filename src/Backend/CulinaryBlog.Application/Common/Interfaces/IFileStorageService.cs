using CulinaryBlog.Application.Common.Models;

namespace CulinaryBlog.Application.Common.Interfaces;

// SRS mục 3.5 (FR-FILE) - abstraction cho object storage, cho phép đổi
// implementation (MinIO <-> AWS S3 <-> local filesystem) mà không sửa
// tầng Application.
// CONS-007: tối đa 5MB, chỉ nhận image/jpeg, image/png, image/webp, image/avif.
public interface IFileStorageService
{
    // Trả về public URL của file sau khi upload qua stream server.
    Task<string> UploadAsync(Stream content, string fileName, string contentType,
        string folder, CancellationToken ct = default);

    // Sinh Presigned PUT URL có thời hạn (15 phút) để client upload trực tiếp lên MinIO
    // không lộ AccessKey/SecretKey và không tải nặng qua server API.
    Task<PresignedUploadResult> GetPresignedUploadUrlAsync(
        string fileName,
        string contentType,
        string folder,
        TimeSpan? expiry = null,
        CancellationToken ct = default);

    // Idempotent: object không tồn tại thì bỏ qua, không ném exception.
    Task DeleteAsync(string fileUrl, CancellationToken ct = default);
}
