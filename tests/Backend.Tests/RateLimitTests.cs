using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace CulinaryBlog.Tests;

[Collection("api")]
public sealed class RateLimitTests(ApiFixture app)
{
    [Fact]
    public async Task Login_limit_keeps_D7_and_reports_retry_headers()
    {
        using var factory = app.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["RateLimits:Login"] = "5" })));
        using var client = factory.CreateClient();
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email = "missing@example.test", password = "BadPassword@123" })).StatusCode);
        var rejected = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = "missing@example.test", password = "BadPassword@123" });
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.True(rejected.Headers.Contains("Retry-After"));
        Assert.Equal("5", rejected.Headers.GetValues("X-RateLimit-Limit").Single());
        Assert.Equal("0", rejected.Headers.GetValues("X-RateLimit-Remaining").Single());
    }

    [Fact]
    public async Task General_limit_applies_to_public_API_but_liveness_stays_available()
    {
        using var factory = app.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["RateLimits:Global"] = "2" })));
        using var client = factory.CreateClient();
        (await client.GetAsync("/api/v1/categories")).EnsureSuccessStatusCode();
        (await client.GetAsync("/api/v1/categories")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.GetAsync("/api/v1/categories")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live")).StatusCode);
    }
}
