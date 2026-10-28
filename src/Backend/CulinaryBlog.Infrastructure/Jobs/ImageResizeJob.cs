using Amazon.S3;
using CulinaryBlog.Application.Common.Interfaces;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ImageMagick;
using CulinaryBlog.Infrastructure.Services;

namespace CulinaryBlog.Infrastructure.Jobs;

/// <summary>
/// FR-JOB-002: Hangfire tạo thumbnail 300x300 và medium tối đa 800x600 bằng Magick.NET.
/// Mức giảm dung lượng được đo theo từng ảnh; ảnh gốc nhỏ có thể lớn hơn sau resize.
/// Thành viên phụ trách: Nguyễn Đình Tuấn (MSSV: 2312792)
/// </summary>
public class ImageResizeJob : IImageResizeJob
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<ImageResizeJob> _logger;
    private readonly JobStorage _storage;

    public const string ThumbnailBucket = "recipe-thumbnails";
    public const int ThumbnailWidth = 300;
    public const int ThumbnailHeight = 300;
    public const int MediumWidth = 800;
    public const int MediumHeight = 600;

    public ImageResizeJob(
        IApplicationDbContext context,
        IFileStorageService fileStorageService,
        ILogger<ImageResizeJob> logger, JobStorage storage)
    {
        _context = context;
        _fileStorageService = fileStorageService;
        _logger = logger;
        _storage = storage;
    }

    [Queue("images"), AutomaticRetry(Attempts = 3)]
    public async Task ProcessRecipeImageAsync(Guid recipeImageId, CancellationToken ct = default)
    {
        using var connection = _storage.GetConnection();
        // Cùng khóa với job xóa để ảnh đã gỡ không bị resize tạo lại sau đó.
        using var gate = connection.AcquireDistributedLock($"recipe-image:{recipeImageId}", TimeSpan.FromSeconds(30));
        _logger.LogInformation("FR-JOB-002: Bắt đầu xử lý nén & resize ảnh thumbnail cho RecipeImage {ImageId}", recipeImageId);

        var recipeImage = await _context.RecipeImages
            .FirstOrDefaultAsync(img => img.Id == recipeImageId && !img.IsDeleted, ct);

        if (recipeImage == null)
        {
            _logger.LogWarning("FR-JOB-002: Không tìm thấy RecipeImage {ImageId} hoặc ảnh đã bị xóa", recipeImageId);
            return;
        }

        if (string.IsNullOrWhiteSpace(recipeImage.OriginalUrl))
        {
            _logger.LogWarning("FR-JOB-002: RecipeImage {ImageId} không có OriginalUrl", recipeImageId);
            return;
        }

        try
        {
            // 1. Tải dữ liệu ảnh gốc
            var (origStream, origLength, _) = await _fileStorageService.DownloadFileAsync(recipeImage.OriginalUrl, ct);
            using (origStream)
            {
                using var image = ImageSafety.ReadVerified(origStream);

                // 2. Tạo ảnh Thumbnail 300x300 chuẩn WebP (Crop tâm vuông cho đẹp card món ăn)
                using var thumbImage = image.Clone();
                thumbImage.Resize(new MagickGeometry(ThumbnailWidth, ThumbnailHeight) { FillArea = true });
                thumbImage.Crop(ThumbnailWidth, ThumbnailHeight, Gravity.Center);
                thumbImage.ResetPage();

                using var thumbStream = new MemoryStream();
                thumbImage.Quality = 75;
                await thumbImage.WriteAsync(thumbStream, MagickFormat.WebP, ct);
                thumbStream.Position = 0;
                var thumbLength = thumbStream.Length;

                // Tính toán tỷ lệ giảm dung lượng
                var savedPercent = origLength > 0 ? (1.0 - (double)thumbLength / origLength) * 100 : 0;
                _logger.LogInformation(
                    "FR-JOB-002 [Magick.NET]: RecipeImage {ImageId} - Gốc: {OrigSize:N0} bytes -> Thumbnail 300x300: {ThumbSize:N0} bytes (Tiết kiệm: {Percent:F1}%)",
                    recipeImageId, origLength, thumbLength, savedPercent);

                // 3. Upload Thumbnail lên bucket 'recipe-thumbnails'
                var thumbFileName = $"{recipeImage.RecipeId}_{recipeImage.Id}_300x300.webp";
                var thumbnailUrl = await _fileStorageService.UploadToBucketAsync(
                    thumbStream,
                    thumbFileName,
                    "image/webp",
                    ThumbnailBucket,
                    folder: $"recipes/{recipeImage.RecipeId}",
                    ct: ct);

                // 4. Tạo ảnh Medium 800x600 chuẩn WebP (phục vụ trang chi tiết công thức)
                using var medImage = image.Clone();
                medImage.Resize(new MagickGeometry(MediumWidth, MediumHeight) { Greater = true });
                using var medStream = new MemoryStream();
                medImage.Quality = 75;
                await medImage.WriteAsync(medStream, MagickFormat.WebP, ct);
                medStream.Position = 0;

                var medFileName = $"{recipeImage.RecipeId}_{recipeImage.Id}_800x600.webp";
                var mediumUrl = await _fileStorageService.UploadToBucketAsync(
                    medStream,
                    medFileName,
                    "image/webp",
                    ThumbnailBucket,
                    folder: $"recipes/{recipeImage.RecipeId}",
                    ct: ct);

                // 5. Cập nhật URLs vào CSDL
                recipeImage.SetGeneratedUrls(mediumUrl, thumbnailUrl);
                await _context.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "FR-JOB-002: Đã lưu thành công! ThumbnailUrl={ThumbnailUrl}, MediumUrl={MediumUrl}",
                    thumbnailUrl, mediumUrl);
            }
        }
        catch (Exception ex)
        {
            // Bổ sung ImageId cho lịch sử lỗi Hangfire, giữ nguyên inner exception.
            throw new InvalidOperationException($"Không thể resize RecipeImage {recipeImageId}.", ex);
        }
    }

    public async Task ProcessAllRecipeImagesAsync(CancellationToken ct = default)
    {
        // Tương thích job batch cũ: chuyển thành intent từng ảnh để có retry/trạng thái riêng.
        var imageIds = await _context.RecipeImages
            .Where(image => image.ThumbnailUrl == null || image.MediumUrl == null)
            .Select(image => image.Id).ToListAsync(ct);
        foreach (var id in imageIds)
            _context.PendingJobs.Add(CulinaryBlog.Domain.Entities.PendingJob.Resize(id));
        await _context.SaveChangesAsync(ct);
    }
}
