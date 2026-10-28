namespace CulinaryBlog.Application.Common.Interfaces;

/// <summary>
/// FR-JOB-002: Tạo ảnh WebP thumbnail 300x300 và medium tối đa 800x600.
/// Implementation Magick.NET và object storage nằm ở Infrastructure theo D15.
/// Thành viên phụ trách: Nguyễn Đình Tuấn (MSSV: 2312792)
/// </summary>
public interface IImageResizeJob
{
    Task ProcessRecipeImageAsync(Guid recipeImageId, CancellationToken ct = default);
    // Giữ chữ ký cho các job batch đã được lưu trong Hangfire trước khi chuyển API sang CQRS.
    Task ProcessAllRecipeImagesAsync(CancellationToken ct = default);
}
