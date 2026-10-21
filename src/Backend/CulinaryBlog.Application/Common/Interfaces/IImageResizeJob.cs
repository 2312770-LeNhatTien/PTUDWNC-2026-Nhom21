namespace CulinaryBlog.Application.Common.Interfaces;

/// <summary>
/// FR-JOB-002: Hangfire Background Job tự động nén & resize ảnh thumbnail 300x300 (ImageSharp).
/// Lưu ảnh thumbnail vào bucket recipe-thumbnails trên MinIO, giảm >70% dung lượng.
/// Thành viên phụ trách: Nguyễn Đình Tuấn (MSSV: 2312792)
/// </summary>
public interface IImageResizeJob
{
    Task ProcessRecipeImageAsync(Guid recipeImageId, CancellationToken ct = default);
    Task ProcessAllRecipeImagesAsync(CancellationToken ct = default);
}
