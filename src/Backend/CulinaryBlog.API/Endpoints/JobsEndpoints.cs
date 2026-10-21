using System.Security.Claims;
using CulinaryBlog.API.Authorization;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Infrastructure.Jobs;
using Hangfire;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CulinaryBlog.API.Endpoints;

public static class JobsEndpoints
{
    public static void MapJobsEndpoints(this WebApplication app)
    {
        var options = app.Services.GetRequiredService<IOptions<SitemapOptions>>().Value;
        var directory = options.ResolveDirectory(app.Environment.ContentRootPath);
        foreach (var (name, contentType) in new[] { ("sitemap.xml", "application/xml; charset=utf-8"), ("robots.txt", "text/plain; charset=utf-8") })
        {
            var path = Path.Combine(directory, name);
            app.MapGet("/" + name, (HttpContext context) =>
            {
                context.Response.Headers.CacheControl = "no-cache";
                return File.Exists(path) ? Results.File(path, contentType) :
                    Results.Problem(statusCode: 503, title: "Tệp SEO chưa sẵn sàng.", detail: "Job chưa tạo được phiên bản hợp lệ. Vui lòng thử lại sau.");
            }).AllowAnonymous().ExcludeFromDescription();
        }

        // ── Nhóm API Jobs cho FR-JOB-002 (Nén & Resize ảnh Thumbnail) ─────────────
        var jobsGroup = app.MapGroup("/api/v1/jobs").WithTags("Background Jobs");

        // FR-JOB-002: Kích hoạt tạo thumbnail cho 1 ảnh công thức cụ thể
        jobsGroup.MapPost("/recipes/{recipeId:guid}/images/{imageId:guid}/resize", (
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
        jobsGroup.MapPost("/resize-all", (IBackgroundJobService jobService) =>
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
        jobsGroup.MapGet("/stats", async (IApplicationDbContext context) =>
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

        if (!app.Configuration.GetValue("Jobs:Enabled", true)) return;

        var recurring = app.Services.GetRequiredService<IRecurringJobManager>();
        recurring.AddOrUpdate<SitemapJob>(SitemapOptions.JobId, job => job.RunAsync(CancellationToken.None),
            options.Cron, new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
        if (!File.Exists(Path.Combine(directory, "sitemap.xml")) || !File.Exists(Path.Combine(directory, "robots.txt")))
            app.Services.GetRequiredService<IBackgroundJobClient>().Enqueue<SitemapJob>(job => job.RunAsync(CancellationToken.None));

        app.MapHangfireDashboard("/hangfire", new DashboardOptions
        {
            Authorization = [new HangfireAuthorizationFilter()],
            AppPath = options.SiteBaseUrl.TrimEnd('/') + "/admin/jobs",
            DashboardTitle = "Culinary Blog — Tác vụ nền",
        }).RequireAuthorization(HangfireAuthorizationFilter.Scheme);

        var admin = app.MapGroup("/api/v1/admin/hangfire").WithTags("Background Jobs").RequireAuthorization("AdminOnly");
        admin.MapPost("/session", async (DashboardSessionRequest request, HttpContext context,
            IApplicationDbContext db, IJwtService jwt, UserManager<ApplicationUser> manager, CancellationToken ct) =>
        {
            var id = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = id is null ? null : await manager.FindByIdAsync(id);
            if (user?.IsActive != true || !await manager.IsInRoleAsync(user, "Admin")) return Results.Forbid();
            if (string.IsNullOrWhiteSpace(request.RefreshToken) || !long.TryParse(context.User.FindFirstValue("exp"), out var exp))
                return Results.Problem(statusCode: 400, title: "Không thể tạo phiên dashboard.");
            var hash = jwt.HashRefreshToken(request.RefreshToken);
            if (!await db.RefreshTokens.AnyAsync(t => t.UserId == id && t.TokenHash == hash &&
                t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow, ct)) return Results.Unauthorized();
            var expires = DateTimeOffset.FromUnixTimeSeconds(exp);
            if (expires <= DateTimeOffset.UtcNow) return Results.Unauthorized();
            if (expires > DateTimeOffset.UtcNow.AddMinutes(15)) expires = DateTimeOffset.UtcNow.AddMinutes(15);
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, id!),
                new Claim(ClaimTypes.Name, user.DisplayName), new Claim(ClaimTypes.Role, "Admin"),
                new Claim(HangfireAuthorizationFilter.RefreshHashClaim, hash) }, HangfireAuthorizationFilter.Scheme);
            await context.SignInAsync(HangfireAuthorizationFilter.Scheme, new ClaimsPrincipal(identity),
                new AuthenticationProperties { ExpiresUtc = expires, IsPersistent = false, AllowRefresh = false });
            return Results.NoContent();
        }).WithSummary("Tạo phiên Hangfire từ JWT Admin và refresh token đang hoạt động");
        admin.MapPost("/sitemap", (IRecurringJobManager jobs) =>
        {
            jobs.Trigger(SitemapOptions.JobId);
            return Results.Accepted(value: ApiResponse.Ok(new { recurringJobId = SitemapOptions.JobId }));
        })
            .WithSummary("Đưa tác vụ tạo lại sitemap vào hàng đợi");
    }

    public record DashboardSessionRequest(string RefreshToken);
}
