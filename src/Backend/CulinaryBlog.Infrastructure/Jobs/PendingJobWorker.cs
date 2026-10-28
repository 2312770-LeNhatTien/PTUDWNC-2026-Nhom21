using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Infrastructure.Services;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CulinaryBlog.Infrastructure.Jobs;

public sealed class PendingJobWorker(IApplicationDbContext db, JobStorage storage,
    IEmailService email, IImageResizeJob images, IFileStorageService files, IConfiguration config)
{
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 1800 })]
    public Task SendWelcomeAsync(Guid id, CancellationToken ct) => ExecuteAsync(id, "welcome", ct);

    [Queue("images"), AutomaticRetry(Attempts = 3)]
    public Task ResizeAsync(Guid id, CancellationToken ct) => ExecuteAsync(id, "resize", ct);

    [Queue("images"), AutomaticRetry(Attempts = 3)]
    public Task DeleteAsync(Guid id, CancellationToken ct) => ExecuteAsync(id, null, ct);

    private async Task ExecuteAsync(Guid id, string? expectedKind, CancellationToken ct)
    {
        using var connection = storage.GetConnection();
        // Enqueue có thể lặp nếu tiến trình chết giữa enqueue và save; hoàn tất chỉ một lần.
        using var gate = connection.AcquireDistributedLock($"pending-job:{id}", TimeSpan.FromSeconds(30));
        var job = await db.PendingJobs.SingleAsync(x => x.Id == id, ct);
        if (job.CompletedAt != null) return;
        if (expectedKind != null && expectedKind != job.Kind) throw new InvalidOperationException("Sai loại công việc.");
        switch (job.Kind)
        {
            case "welcome":
                var user = await db.Users.SingleOrDefaultAsync(u => u.Id == job.UserId && u.IsActive, ct);
                if (user?.Email != null)
                    await email.SendAsync(user.Email, WelcomeEmailTemplate.DefaultSubject,
                        WelcomeEmailTemplate.BuildHtml(user.DisplayName, config["Sitemap:SiteBaseUrl"]
                            ?? throw new InvalidOperationException("Thiếu Sitemap:SiteBaseUrl cho email chào mừng.")), ct);
                break;
            case "resize":
                await images.ProcessRecipeImageAsync(job.ResourceId!.Value, ct);
                break;
            case "delete-image":
                // Cùng khóa với resize để worker không ghi lại ảnh ngay sau lúc xóa.
                using (connection.AcquireDistributedLock($"recipe-image:{job.ResourceId}", TimeSpan.FromSeconds(30)))
                {
                    var image = await db.RecipeImages.IgnoreQueryFilters().SingleOrDefaultAsync(i => i.Id == job.ResourceId, ct);
                    if (image?.IsDeleted == true)
                        // Dọn cả biến thể upload trước một lần lưu DB thất bại, dù URL chưa kịp lưu.
                        foreach (var url in new[] { image.OriginalUrl, image.MediumUrl, image.ThumbnailUrl }.OfType<string>()
                            .Concat(files.GetGeneratedImageUrls(image.RecipeId, image.Id)).Distinct())
                            await DeleteIfUnusedAsync(url, image.Id, ct);
                }
                break;
            case "delete-file":
                await DeleteIfUnusedAsync(job.FileUrl!, null, ct);
                break;
            default: throw new InvalidOperationException("Loại công việc không được hỗ trợ.");
        }
        job.Complete();
        await db.SaveChangesAsync(ct);
    }

    private async Task DeleteIfUnusedAsync(string url, Guid? excludingImage, CancellationToken ct)
    {
        // Kể cả Recipe đã soft-delete vẫn giữ file theo D1; chỉ bỏ qua ảnh gallery đã xóa.
        if (await db.RecipeImages.IgnoreQueryFilters().AnyAsync(i => i.Id != excludingImage && !i.IsDeleted &&
                (i.OriginalUrl == url || i.MediumUrl == url || i.ThumbnailUrl == url), ct) ||
            await db.RecipeSteps.IgnoreQueryFilters().AnyAsync(s => s.ImageUrl == url, ct) ||
            await db.Users.AnyAsync(u => u.AvatarUrl == url, ct)) return;
        await files.DeleteAsync(url, ct);
    }
}
