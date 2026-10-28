using Amazon.S3;
using CulinaryBlog.Application.Common.Interfaces;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace CulinaryBlog.Infrastructure.Jobs;

/// <summary>
/// FR-JOB-002: Hangfire Background Job tự động nén & resize ảnh thumbnail 300x300 (ImageSharp)
/// Lưu ảnh thumbnail vào bucket recipe-thumbnails trên MinIO, giảm >70% dung lượng.
/// Thành viên phụ trách: Nguyễn Đình Tuấn (MSSV: 2312792)
/// </summary>
public class ImageResizeJob : IImageResizeJob
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<ImageResizeJob> _logger;

    public const string ThumbnailBucket = "recipe-thumbnails";
    public const int ThumbnailWidth = 300;
    public const int ThumbnailHeight = 300;
    public const int MediumWidth = 800;
    public const int MediumHeight = 600;

    public ImageResizeJob(
        IApplicationDbContext context,
        IFileStorageService fileStorageService,
        ILogger<ImageResizeJob> logger)
    {
        _context = context;
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3)]
    public async Task ProcessRecipeImageAsync(Guid recipeImageId, CancellationToken ct = default)
    {
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
                using var image = await Image.LoadAsync(origStream, ct);

                // 2. Tạo ảnh Thumbnail 300x300 chuẩn WebP (Crop tâm vuông cho đẹp card món ăn)
                using var thumbImage = image.Clone(ctx => ctx.Resize(new ResizeOptions
                {
                    Size = new Size(ThumbnailWidth, ThumbnailHeight),
                    Mode = ResizeMode.Crop,
                    Position = AnchorPositionMode.Center
                }));

                using var thumbStream = new MemoryStream();
                var webpEncoder = new WebpEncoder
                {
                    Quality = 75 // Nén tối ưu chất lượng, giảm > 70% dung lượng
                };
                await thumbImage.SaveAsync(thumbStream, webpEncoder, ct);
                thumbStream.Position = 0;
                var thumbLength = thumbStream.Length;

                // Tính toán tỷ lệ giảm dung lượng
                var savedPercent = origLength > 0 ? (1.0 - (double)thumbLength / origLength) * 100 : 0;
                _logger.LogInformation(
                    "FR-JOB-002 [ImageSharp]: RecipeImage {ImageId} - Gốc: {OrigSize:N0} bytes -> Thumbnail 300x300: {ThumbSize:N0} bytes (Tiết kiệm: {Percent:F1}%)",
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
                using var medImage = image.Clone(ctx => ctx.Resize(new ResizeOptions
                {
                    Size = new Size(MediumWidth, MediumHeight),
                    Mode = ResizeMode.Max
                }));
                using var medStream = new MemoryStream();
                await medImage.SaveAsync(medStream, webpEncoder, ct);
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
            _logger.LogError(ex, "FR-JOB-002: Lỗi trong quá trình nén và resize ảnh {ImageId}", recipeImageId);
            throw; // Ném exception để Hangfire tự động retry theo [AutomaticRetry]
        }
    }

    public async Task ProcessAllRecipeImagesAsync(CancellationToken ct = default)
    {
        var imageIds = await _context.RecipeImages
            .Where(img => !img.IsDeleted && (img.ThumbnailUrl == null || img.MediumUrl == null))
            .Select(img => img.Id)
            .ToListAsync(ct);

        _logger.LogInformation("FR-JOB-002: Tìm thấy {Count} ảnh cần nén & resize sang thumbnail", imageIds.Count);

        foreach (var id in imageIds)
        {
            try
            {
                await ProcessRecipeImageAsync(id, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "FR-JOB-002: Không thể xử lý ảnh {ImageId}", id);
            }
        }
    }
}
