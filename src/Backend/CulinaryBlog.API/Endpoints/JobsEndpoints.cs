using CulinaryBlog.Application.Common.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.API.Endpoints;

/// <summary>
/// Các endpoints quản lý và kích hoạt Background Jobs (FR-JOB-002).
/// Phục vụ kiểm thử, đo lường tỷ lệ giảm dung lượng và quản trị Hangfire.
/// </summary>
public static class JobsEndpoints
{
    public static void MapJobsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/jobs")
            .WithTags("Jobs");

        // FR-JOB-002: Kích hoạt tạo thumbnail cho 1 ảnh công thức cụ thể
        group.MapPost("/recipes/{recipeId:guid}/images/{imageId:guid}/resize", (
            Guid recipeId,
            Guid imageId,
            IBackgroundJobService jobService) =>
        {
            var jobId = jobService.Enqueue<IImageResizeJob>(job => job.ProcessRecipeImageAsync(imageId, CancellationToken.None));
            return Results.Ok(new
            {
                Message = "Đã kích hoạt Hangfire Background Job nén & resize ảnh thumbnail 300x300",
                JobId = jobId,
                RecipeId = recipeId,
                ImageId = imageId
            });
        })
        .WithName("TriggerRecipeImageResize")
        .WithSummary("FR-JOB-002: Kích hoạt Hangfire Background Job nén và resize ảnh thumbnail 300x300");

        // FR-JOB-002: Kích hoạt nén & tạo thumbnail cho toàn bộ ảnh công thức chưa có thumbnail
        group.MapPost("/resize-all", (IBackgroundJobService jobService) =>
        {
            var jobId = jobService.Enqueue<IImageResizeJob>(job => job.ProcessAllRecipeImagesAsync(CancellationToken.None));
            return Results.Ok(new
            {
                Message = "Đã kích hoạt Hangfire Background Job xử lý thumbnail cho toàn bộ ảnh công thức",
                JobId = jobId
            });
        })
        .WithName("TriggerResizeAllImages")
        .WithSummary("FR-JOB-002: Kích hoạt tạo thumbnail hàng loạt cho tất cả ảnh công thức");

        // Thống kê ảnh thumbnail và dung lượng tiết kiệm
        group.MapGet("/stats", async (IApplicationDbContext context) =>
        {
            var totalImages = await context.RecipeImages.CountAsync(i => !i.IsDeleted);
            var withThumbnail = await context.RecipeImages.CountAsync(i => !i.IsDeleted && i.ThumbnailUrl != null);
            var withMedium = await context.RecipeImages.CountAsync(i => !i.IsDeleted && i.MediumUrl != null);

            var sampleProcessed = await context.RecipeImages
                .Where(i => !i.IsDeleted && i.ThumbnailUrl != null)
                .OrderByDescending(i => i.UpdatedAt)
                .Take(5)
                .Select(i => new
                {
                    i.Id,
                    i.RecipeId,
                    i.OriginalUrl,
                    i.ThumbnailUrl,
                    i.MediumUrl
                })
                .ToListAsync();

            return Results.Ok(new
            {
                TotalRecipeImages = totalImages,
                ProcessedThumbnails = withThumbnail,
                ProcessedMedium = withMedium,
                TargetReduction = "> 70% dung lượng",
                ThumbnailSpec = "300x300 WebP (Quality 75) tại bucket recipe-thumbnails",
                MediumSpec = "800x600 WebP (Quality 75) tại bucket recipe-thumbnails",
                Bucket = "recipe-thumbnails",
                RecentProcessedImages = sampleProcessed
            });
        })
        .WithName("GetJobStats")
        .WithSummary("Thống kê tiến trình nén ảnh Thumbnail Hangfire");
    }
}
