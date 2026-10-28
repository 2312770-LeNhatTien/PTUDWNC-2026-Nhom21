using System.Security.Claims;
using CulinaryBlog.API.Authorization;
using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Infrastructure.Jobs;
using Hangfire;
using MediatR;
using CulinaryBlog.Application.Features.Auth.Commands.CreateDashboardSession;
using CulinaryBlog.Application.Features.Jobs.Commands.QueueRecipeImageResize;
using CulinaryBlog.Application.Features.Jobs.Commands.QueueMissingImageResizes;
using CulinaryBlog.Application.Features.Jobs.Queries.GetImageJobStats;
using Microsoft.AspNetCore.Authentication;
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
        var jobsGroup = app.MapGroup("/api/v1/jobs").WithTags("Background Jobs")
            .RequireAuthorization("AuthorOrAdmin");

        // Endpoint chỉ nhận HTTP và trả DTO; nghiệp vụ/quyền tài nguyên nằm trong handler.
        jobsGroup.MapPost("/recipes/{recipeId:guid}/images/{imageId:guid}/resize", async (
            Guid recipeId, Guid imageId, ISender sender, CancellationToken ct) =>
            Results.Ok(ApiResponse.Ok(await sender.Send(new QueueRecipeImageResizeCommand(recipeId, imageId), ct))))
            .WithName("TriggerRecipeImageResize")
            .WithSummary("FR-JOB-002: Yêu cầu resize một ảnh công thức")
            .RequireRateLimiting("UploadRateLimitPolicy");

        jobsGroup.MapPost("/resize-all", async (ISender sender, CancellationToken ct) =>
            Results.Ok(ApiResponse.Ok(await sender.Send(new QueueMissingImageResizesCommand(), ct))))
            .WithName("TriggerResizeAllImages")
            .WithSummary("FR-JOB-002: Yêu cầu resize ảnh còn thiếu biến thể")
            .RequireAuthorization("AdminOnly").RequireRateLimiting("UploadRateLimitPolicy");

        jobsGroup.MapGet("/stats", async (ISender sender, CancellationToken ct) =>
            Results.Ok(ApiResponse.Ok(await sender.Send(new GetImageJobStatsQuery(), ct))))
            .WithName("GetJobStats")
            .WithSummary("Thống kê ảnh đã xử lý")
            .RequireAuthorization("AdminOnly");

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
            ISender sender, CancellationToken ct) =>
        {
            if (!long.TryParse(context.User.FindFirstValue("exp"), out var exp))
                return Results.Problem(statusCode: 400, title: "Không thể tạo phiên dashboard.");
            var session = await sender.Send(new CreateDashboardSessionCommand(request.RefreshToken, exp), ct);
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, session.UserId),
                new Claim(ClaimTypes.Name, session.DisplayName), new Claim(ClaimTypes.Role, "Admin"),
                new Claim(HangfireAuthorizationFilter.RefreshHashClaim, session.RefreshHash) }, HangfireAuthorizationFilter.Scheme);
            // Cookie/claims là chi tiết HTTP; xác minh phiên và quyền đã thực hiện trong Application.
            await context.SignInAsync(HangfireAuthorizationFilter.Scheme, new ClaimsPrincipal(identity),
                new AuthenticationProperties { ExpiresUtc = session.ExpiresAt, IsPersistent = false, AllowRefresh = false });
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
