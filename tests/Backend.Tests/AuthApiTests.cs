using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CulinaryBlog.Tests;

[Collection("api")]
public sealed class AuthApiTests(ApiFixture app)
{
    private static string Email() => Guid.NewGuid().ToString("N") + "@example.test";

    [Fact]
    public async Task Registration_profile_and_logout_persist_welcome_without_worker()
    {
        var email = Email();
        var response = await app.Guest.PostAsJsonAsync("/api/v1/auth/register", new { email, password = ApiFixture.Password, displayName = "Tác giả mới" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var session = await ApiFixture.DataAsync(response);
        using var client = app.ClientFor(session);
        var profile = await ApiFixture.DataAsync(await client.GetAsync("/api/v1/auth/me"));
        Assert.Equal(email, profile.GetProperty("email").GetString());
        var updated = await ApiFixture.DataAsync(await client.PatchAsJsonAsync("/api/v1/auth/me", new { displayName = "Tên mới", bio = "Mô tả cá nhân" }));
        Assert.Equal("Tên mới", updated.GetProperty("displayName").GetString());
        Assert.False(updated.TryGetProperty("passwordHash", out _));
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
            Assert.Single(await db.PendingJobs.Where(j => j.Kind == "welcome" && j.UserId == profile.GetProperty("id").GetString()).ToListAsync());
        }
        var token = session.GetProperty("refreshToken").GetString();
        (await client.PostAsJsonAsync("/api/v1/auth/logout", new { refreshToken = token })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = token })).StatusCode);
    }

    [Fact]
    public async Task Invalid_registration_duplicate_and_login_are_reported()
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await app.Guest.PostAsJsonAsync("/api/v1/auth/register", new { email = "bad", password = "x", displayName = "" })).StatusCode);
        var email = Email(); await app.RegisterAsync(email);
        Assert.Equal(HttpStatusCode.Conflict, (await app.Guest.PostAsJsonAsync("/api/v1/auth/register", new { email, password = ApiFixture.Password, displayName = "Trùng" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "WrongPassword@123" })).StatusCode);
        var session = await ApiFixture.DataAsync(await app.Guest.PostAsJsonAsync("/api/v1/auth/login", new { email, password = ApiFixture.Password }));
        Assert.False(string.IsNullOrEmpty(session.GetProperty("accessToken").GetString()));
    }

    [Fact]
    public async Task Refresh_rotation_reuse_and_concurrent_requests_are_fail_closed()
    {
        var session = await app.RegisterAsync(Email());
        var token = session.GetProperty("refreshToken").GetString();
        var results = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ =>
            app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = token })));
        Assert.Single(results, r => r.IsSuccessStatusCode);
        Assert.Single(results, r => r.StatusCode == HttpStatusCode.Unauthorized);
        var winner = await ApiFixture.DataAsync(results.Single(r => r.IsSuccessStatusCode));
        Assert.NotEqual(token, winner.GetProperty("refreshToken").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = winner.GetProperty("refreshToken").GetString() })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = "not-a-real-token" })).StatusCode);
    }

    [Fact]
    public async Task Google_handler_links_by_subject_and_blocks_local_email_takeover()
    {
        var subject = "google-" + Guid.NewGuid().ToString("N");
        var first = await ApiFixture.DataAsync(await app.Guest.PostAsJsonAsync("/api/v1/auth/google", new { idToken = subject }));
        var second = await ApiFixture.DataAsync(await app.Guest.PostAsJsonAsync("/api/v1/auth/google", new { idToken = subject }));
        Assert.Equal(first.GetProperty("user").GetProperty("id").GetString(), second.GetProperty("user").GetProperty("id").GetString());
        var localSubject = "local-" + Guid.NewGuid().ToString("N");
        await app.RegisterAsync(localSubject + "@example.test");
        var conflict = await app.Guest.PostAsJsonAsync("/api/v1/auth/google", new { idToken = localSubject });
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        Assert.Equal("GOOGLE_ACCOUNT_LINK_REQUIRED", (await conflict.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errorCode").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.PostAsJsonAsync("/api/v1/auth/google", new { idToken = "invalid" })).StatusCode);
    }

    [Fact]
    public async Task Health_liveness_and_correlation_header_do_not_leak_internal_errors()
    {
        app.Guest.DefaultRequestHeaders.Add("X-Correlation-ID", "regression-123");
        var response = await app.Guest.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("regression-123", response.Headers.GetValues("X-Correlation-ID").Single());
        app.Guest.DefaultRequestHeaders.Remove("X-Correlation-ID");
    }
}
