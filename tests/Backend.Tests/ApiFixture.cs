using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace CulinaryBlog.Tests;

[CollectionDefinition("api")]
public sealed class ApiCollection : ICollectionFixture<ApiFixture> { }

// Mọi migration/ghi dữ liệu dùng database ngẫu nhiên có prefix riêng, không dùng DB demo.
public sealed class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string Password = "TestPassword@123";
    public string DatabaseName { get; } = "culinary_tests_" + Guid.NewGuid().ToString("N");
    public string ConnectionString { get; private set; } = "";
    public string AdminConnection { get; } = Environment.GetEnvironmentVariable("CULINARY_TEST_ADMIN_CONNECTION")
        ?? "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres";
    public HttpClient Guest { get; private set; } = null!;
    public HttpClient Owner { get; private set; } = null!;
    public HttpClient Other { get; private set; } = null!;
    public HttpClient Admin { get; private set; } = null!;
    public Guid CategoryId { get; private set; }
    public string OwnerId { get; private set; } = "";
    public JsonElement OwnerSession { get; private set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        // Các giá trị đọc ngay trong AddInfrastructure phải có trước khi Program đăng ký service.
        builder.UseSetting("Jobs:Enabled", "false");
        builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);
        builder.UseSetting("JwtSettings:Key", "integration-tests-secret-at-least-thirty-two-characters");
        builder.UseSetting("JwtSettings:Issuer", "CulinaryBlog");
        builder.UseSetting("JwtSettings:Audience", "CulinaryBlog");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = ConnectionString,
            ["ConnectionStrings:Redis"] = "localhost:6379",
            ["MinIO:Bucket"] = DatabaseName.Replace('_', '-'),
            ["Jobs:Enabled"] = "false",
            ["JwtSettings:Key"] = "integration-tests-secret-at-least-thirty-two-characters",
            ["JwtSettings:Issuer"] = "CulinaryBlog", ["JwtSettings:Audience"] = "CulinaryBlog",
            ["RateLimits:Global"] = "10000", ["RateLimits:Login"] = "10000",
            ["RateLimits:AuthRateLimitPolicy"] = "10000", ["RateLimits:UploadRateLimitPolicy"] = "10000",
            ["Sitemap:OutputDirectory"] = Path.Combine(Path.GetTempPath(), DatabaseName),
            ["Sitemap:SiteBaseUrl"] = "http://localhost:3000",
            ["Sitemap:SubmitToSearchConsole"] = "false", ["Telemetry:Enabled"] = "false"
        }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IGoogleTokenValidator>();
            services.AddSingleton<IGoogleTokenValidator, TestGoogleValidator>();
            services.RemoveAll<ICacheService>();
            services.AddSingleton<ICacheService, MemoryTestCache>();
            services.RemoveAll<Amazon.S3.IAmazonS3>();
            services.AddSingleton<Amazon.S3.IAmazonS3>(TestObjectStorage.Create());
        });
    }

    public async Task InitializeAsync()
    {
        await using (var admin = new NpgsqlConnection(AdminConnection))
        {
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE \"{DatabaseName}\"", admin);
            await create.ExecuteNonQueryAsync();
        }
        var connection = new NpgsqlConnectionStringBuilder(AdminConnection) { Database = DatabaseName };
        ConnectionString = connection.ConnectionString;
        Guest = CreateClient();
        using (var scope = Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
            await db.Database.MigrateAsync();
            var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            foreach (var name in new[] { "Admin", "Author" }) await roles.CreateAsync(new IdentityRole(name));
            var category = Category.Create("Món kiểm thử");
            db.Categories.Add(category); await db.SaveChangesAsync(); CategoryId = category.Id;
        }
        OwnerSession = await RegisterAsync("owner@example.test");
        OwnerId = OwnerSession.GetProperty("user").GetProperty("id").GetString()!;
        Owner = ClientFor(OwnerSession);
        Other = ClientFor(await RegisterAsync("other@example.test"));
        var adminSession = await RegisterAsync("admin@example.test");
        using (var scope = Services.CreateScope())
        {
            var manager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            await manager.AddToRoleAsync((await manager.FindByEmailAsync("admin@example.test"))!, "Admin");
        }
        Admin = ClientFor(await DataAsync(await Guest.PostAsJsonAsync("/api/v1/auth/login", new { email = "admin@example.test", password = Password })));
    }

    public async Task<JsonElement> RegisterAsync(string email)
        => await DataAsync(await Guest.PostAsJsonAsync("/api/v1/auth/register", new { email, password = Password, displayName = "Người thử" }));
    public HttpClient ClientFor(JsonElement session)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.GetProperty("accessToken").GetString());
        return client;
    }
    public static async Task<JsonElement> DataAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"HTTP {(int)response.StatusCode}: {text}");
        return JsonDocument.Parse(text).RootElement.GetProperty("data").Clone();
    }
    public async Task<JsonElement> CreateRecipeAsync(string? title = null, bool content = false)
        => await DataAsync(await Owner.PostAsJsonAsync("/api/v1/recipes", new
        {
            title = title ?? "Món thử " + Guid.NewGuid().ToString("N"), description = "Mô tả bún bò kiểm thử", instructions = "Nấu chín",
            categoryId = CategoryId, prepTime = 10, cookTime = 20, servings = 4, difficulty = "Easy",
            ingredients = content ? new[] { new { name = "Muối", quantity = (decimal?)null, unit = (string?)null } } : null,
            steps = content ? new[] { new { title = "Nấu", description = "Đun sôi" } } : null
        }));

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        NpgsqlConnection.ClearAllPools();
        // Chỉ dọn database do chính fixture này tạo, không nhận tên từ request hay dữ liệu ngoài.
        if (!System.Text.RegularExpressions.Regex.IsMatch(DatabaseName, "^culinary_tests_[a-f0-9]{32}$")) return;
        await using var admin = new NpgsqlConnection(AdminConnection); await admin.OpenAsync();
        await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{DatabaseName}\" WITH (FORCE)", admin);
        await drop.ExecuteNonQueryAsync();
    }
}

public sealed class TestGoogleValidator : IGoogleTokenValidator
{
    public Task<GoogleIdentity> ValidateAsync(string token, CancellationToken ct)
    {
        if (token == "invalid") throw new CulinaryBlog.Application.Common.Exceptions.UnauthorizedException("Token không hợp lệ.");
        return Task.FromResult(new GoogleIdentity(token, token + "@example.test", "Google Test", null));
    }
}
