namespace CulinaryBlog.Application.DTOs;

// JobId ở đây định danh intent bền vững; Hangfire ID được cấp khi dispatcher chạy.
public record ImageResizeRequestDto(string Message, Guid JobId, Guid RecipeId, Guid ImageId);
public record ImageResizeBatchDto(string Message, string JobId, int PendingCount);
public record ProcessedImageDto(Guid Id, Guid RecipeId, string OriginalUrl, string? ThumbnailUrl, string? MediumUrl);
public record ImageJobStatsDto(int TotalRecipeImages, int ProcessedThumbnails, int ProcessedMedium,
    string TargetReduction, string ThumbnailSpec, string MediumSpec, string Bucket,
    IReadOnlyList<ProcessedImageDto> RecentProcessedImages);
