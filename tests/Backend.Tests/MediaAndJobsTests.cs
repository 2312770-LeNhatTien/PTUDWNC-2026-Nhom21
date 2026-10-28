using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Infrastructure.Jobs;
using CulinaryBlog.Infrastructure.Persistence;
using Hangfire;
using Hangfire.Common;
using Hangfire.PostgreSql;
using ImageMagick;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace CulinaryBlog.Tests;

[Collection("api")]
public sealed class MediaAndJobsTests(ApiFixture app)
{
    private static byte[] Picture(MagickFormat format = MagickFormat.Png)
    {
        using var image = new MagickImage(MagickColors.Orange, 640, 480);
        using var stream = new MemoryStream(); image.Write(stream, format); return stream.ToArray();
    }
    private static async Task<HttpResponseMessage> UploadAsync(HttpClient client, byte[] bytes, string mime = "image/png")
    {
        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytes); content.Headers.ContentType = new MediaTypeHeaderValue(mime);
        form.Add(content, "file", "picture.png"); form.Add(new StringContent("recipes/gallery"), "folder");
        return await client.PostAsync("/api/v1/files/upload", form);
    }

    [Theory]
    [InlineData("image/png", MagickFormat.Png)] [InlineData("image/jpeg", MagickFormat.Jpeg)]
    [InlineData("image/webp", MagickFormat.WebP)] [InlineData("image/avif", MagickFormat.Avif)]
    public async Task Upload_validates_actual_image_and_assigns_server_owner(string mime, MagickFormat format)
    {
        var data = await ApiFixture.DataAsync(await UploadAsync(app.Owner, Picture(format), mime));
        Assert.Contains($"/users/{app.OwnerId}/recipes/", data.GetProperty("url").GetString());
    }

    [Fact]
    public async Task Guest_bad_bytes_large_file_and_presigned_bypass_are_rejected()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await UploadAsync(app.Guest, Picture())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(app.Owner, Picture(), "image/jpeg")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(app.Owner, new byte[5 * 1024 * 1024 + 1])).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(app.Owner, new byte[] { 137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0 })).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await app.Owner.PostAsJsonAsync("/api/v1/files/presigned-url", new { fileName = "x.png", contentType = "image/png" })).StatusCode);
    }

    [Fact]
    public async Task Files_gallery_and_job_endpoints_enforce_ownership_and_relationships()
    {
        var file = await ApiFixture.DataAsync(await UploadAsync(app.Owner, Picture()));
        var url = file.GetProperty("url").GetString()!;
        var otherRecipe = await app.CreateRecipeAsync(); var id = otherRecipe.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.Forbidden, (await app.Other.DeleteAsync("/api/v1/files?fileUrl=" + Uri.EscapeDataString(url))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{id}/images", new { originalUrl = "http://127.0.0.1/internal" })).StatusCode);
        var image = await ApiFixture.DataAsync(await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{id}/images", new { originalUrl = url }));
        var imageId = image.GetProperty("id").GetGuid();
        var second = await ApiFixture.DataAsync(await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{id}/images", new { originalUrl = url, isPrimary = true }));
        (await app.Owner.PatchAsync($"/api/v1/recipes/{id}/images/{imageId}/primary", null)).EnsureSuccessStatusCode();
        var edited = await ApiFixture.DataAsync(await app.Owner.GetAsync($"/api/v1/recipes/{id}/edit"));
        Assert.Single(edited.GetProperty("recipe").GetProperty("images").EnumerateArray(), i => i.GetProperty("isPrimary").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, (await app.Owner.DeleteAsync("/api/v1/files?fileUrl=" + Uri.EscapeDataString(url))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.GetAsync("/api/v1/jobs/stats")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await app.Owner.GetAsync("/api/v1/jobs/stats")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await app.Owner.PostAsync("/api/v1/jobs/resize-all", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await app.Other.PostAsync($"/api/v1/jobs/recipes/{id}/images/{imageId}/resize", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await app.Owner.PostAsync($"/api/v1/jobs/recipes/{Guid.NewGuid()}/images/{imageId}/resize", null)).StatusCode);
        var resize = await ApiFixture.DataAsync(await app.Owner.PostAsync($"/api/v1/jobs/recipes/{id}/images/{imageId}/resize", null));
        Assert.Equal(imageId, resize.GetProperty("imageId").GetGuid());
        Assert.NotEqual(Guid.Empty, resize.GetProperty("jobId").GetGuid());
        var stats = await ApiFixture.DataAsync(await app.Admin.GetAsync("/api/v1/jobs/stats"));
        Assert.True(stats.GetProperty("totalRecipeImages").GetInt32() >= 2);
        var batch = await ApiFixture.DataAsync(await app.Admin.PostAsync("/api/v1/jobs/resize-all", null));
        Assert.True(batch.GetProperty("pendingCount").GetInt32() >= 2);
        Assert.Equal(HttpStatusCode.NoContent, (await app.Owner.DeleteAsync($"/api/v1/recipes/{id}/images/{imageId}")).StatusCode);
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
        Assert.True(await db.PendingJobs.AnyAsync(j => j.Kind == "delete-image" && j.ResourceId == imageId));
    }

    [Fact]
    public async Task Raw_file_delete_uses_mediator_and_keeps_intent_when_jobs_are_disabled()
    {
        var uploaded = await ApiFixture.DataAsync(await UploadAsync(app.Owner, Picture()));
        var url = uploaded.GetProperty("url").GetString()!;
        var path = "/api/v1/files?fileUrl=" + Uri.EscapeDataString(url);
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.DeleteAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await app.Owner.DeleteAsync(path)).StatusCode);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
        Assert.True(await db.PendingJobs.AnyAsync(j => j.Kind == "delete-file" && j.FileUrl == url && j.CompletedAt == null));
    }

    [Fact]
    public async Task Welcome_and_image_jobs_are_durable_idempotent_and_use_real_retry_filters()
    {
        GlobalConfiguration.Configuration.UsePostgreSqlStorage(pg => pg.UseNpgsqlConnection(app.ConnectionString));
        var storage = JobStorage.Current;
        var session = await app.RegisterAsync("welcome-" + Guid.NewGuid().ToString("N") + "@example.test");
        var userId = session.GetProperty("user").GetProperty("id").GetString();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
        var files = scope.ServiceProvider.GetRequiredService<IFileStorageService>();
        var images = new ImageResizeJob(db, files, NullLogger<ImageResizeJob>.Instance, storage);
        var mail = new TestEmail();
        var worker = new PendingJobWorker(db, storage, mail, images, files, scope.ServiceProvider.GetRequiredService<IConfiguration>());
        var pending = await db.PendingJobs.SingleAsync(j => j.Kind == "welcome" && j.UserId == userId);
        mail.Fail = true;
        await Assert.ThrowsAsync<IOException>(() => worker.SendWelcomeAsync(pending.Id, default));
        Assert.Null(pending.CompletedAt);
        mail.Fail = false;
        await worker.SendWelcomeAsync(pending.Id, default); await worker.SendWelcomeAsync(pending.Id, default);
        Assert.Equal(1, mail.Sent);
        var retry = JobFilterProviders.Providers.GetFilters(Job.FromExpression<PendingJobWorker>(w => w.SendWelcomeAsync(pending.Id, default)))
            .Select(f => f.Instance).OfType<AutomaticRetryAttribute>().Last();
        Assert.Equal(3, retry.Attempts); Assert.Equal(new[] { 60, 300, 1800 }, retry.DelaysInSeconds);

        var data = await ApiFixture.DataAsync(await UploadAsync(app.Owner, Picture()));
        var recipe = await app.CreateRecipeAsync(); var id = recipe.GetProperty("id").GetGuid();
        var image = await ApiFixture.DataAsync(await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{id}/images", new { originalUrl = data.GetProperty("url").GetString() }));
        var imageId = image.GetProperty("id").GetGuid();
        await images.ProcessRecipeImageAsync(imageId); var row = await db.RecipeImages.SingleAsync(i => i.Id == imageId);
        var before = row.ThumbnailUrl;
        await images.ProcessRecipeImageAsync(imageId); Assert.Equal(before, row.ThumbnailUrl);
        var downloaded = await files.DownloadFileAsync(before!);
        using (downloaded.Stream) using (var thumb = new MagickImage(downloaded.Stream))
        { Assert.Equal(300u, thumb.Width); Assert.Equal(300u, thumb.Height); Assert.Equal(MagickFormat.WebP, thumb.Format); }
        Assert.NotNull(row.MediumUrl);
        // Xóa mềm cả Recipe giữ nguyên file theo D1, không phát sinh job delete-image.
        (await app.Owner.DeleteAsync($"/api/v1/recipes/{id}")).EnsureSuccessStatusCode();
        Assert.False(await db.PendingJobs.AnyAsync(j => j.Kind == "delete-image" && j.ResourceId == imageId));
        using var retained = (await files.DownloadFileAsync(before!)).Stream;
        Assert.True(retained.Length > 0);
    }

    [Fact]
    public async Task Gallery_delete_worker_cleans_variants_and_is_repeatable()
    {
        GlobalConfiguration.Configuration.UsePostgreSqlStorage(pg => pg.UseNpgsqlConnection(app.ConnectionString));
        var storage = JobStorage.Current;
        var recipe = await app.CreateRecipeAsync(); var recipeId = recipe.GetProperty("id").GetGuid();
        var upload = await ApiFixture.DataAsync(await UploadAsync(app.Owner, Picture()));
        var created = await ApiFixture.DataAsync(await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{recipeId}/images", new { originalUrl = upload.GetProperty("url").GetString() }));
        var imageId = created.GetProperty("id").GetGuid();
        using (var resizeScope = app.Services.CreateScope())
        {
            var db = resizeScope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
            var files = resizeScope.ServiceProvider.GetRequiredService<IFileStorageService>();
            await new ImageResizeJob(db, files, NullLogger<ImageResizeJob>.Instance, storage).ProcessRecipeImageAsync(imageId);
        }
        (await app.Owner.DeleteAsync($"/api/v1/recipes/{recipeId}/images/{imageId}")).EnsureSuccessStatusCode();
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
        var fileService = scope.ServiceProvider.GetRequiredService<IFileStorageService>();
        var images = new ImageResizeJob(context, fileService, NullLogger<ImageResizeJob>.Instance, storage);
        var pending = await context.PendingJobs.SingleAsync(j => j.Kind == "delete-image" && j.ResourceId == imageId);
        var worker = new PendingJobWorker(context, storage, new TestEmail(), images, fileService, scope.ServiceProvider.GetRequiredService<IConfiguration>());
        await worker.DeleteAsync(pending.Id, default); await worker.DeleteAsync(pending.Id, default);
        foreach (var url in fileService.GetGeneratedImageUrls(recipeId, imageId).Append(upload.GetProperty("url").GetString()!))
            await Assert.ThrowsAsync<Amazon.S3.AmazonS3Exception>(() => fileService.DownloadFileAsync(url));
        Assert.NotNull(pending.CompletedAt);
    }

    private sealed class TestEmail : IEmailService
    {
        public bool Fail { get; set; }
        public int Sent { get; private set; }
        public Task SendAsync(string to, string subject, string body, CancellationToken ct = default)
        {
            if (Fail) throw new IOException("SMTP offline (test)");
            Assert.Contains("Culinary Blog", body); Sent++; return Task.CompletedTask;
        }
    }
}
