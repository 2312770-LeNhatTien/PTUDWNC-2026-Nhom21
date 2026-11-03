// ============================================================================
// KIỂM THỬ TÍCH HỢP TỰ ĐỘNG E2E: PHÂN HỆ AUTHENTICATION & SECURITY (LAB 8)
// Thành viên: Lâm Văn Đức (MSSV: 2314299)
// Nhóm 21 - PTUDWNC-2026
// Mục tiêu:
// 1. Kiểm thử toàn bộ vòng đời tài khoản (Register -> Welcome Email Intent -> Login -> Me -> Token Rotation -> Logout).
// 2. Kiểm thử bảo mật: Phát hiện tấn công tái sử dụng Refresh Token cũ (Token Reuse Detection & Family Revocation).
// 3. Kiểm thử tuân thủ chuẩn RFC 7807 ProblemDetails (400, 401, 403, 409, 429).
// 4. Kiểm tra các Security Headers và chính sách Rate Limiting (D7 & R20).
// ============================================================================

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CulinaryBlog.Tests;

[Collection("api")]
public sealed class AuthE2EIntegrationTests(ApiFixture app)
{
    private static string GenerateTestEmail() => $"e2e_duc_{Guid.NewGuid():N}@culinaryblog.test";

    /// <summary>
    /// Kịch bản E2E 1: Luồng hoàn chỉnh toàn bộ vòng đời tài khoản:
    /// Đăng ký -> Lưu intent Welcome Email -> Đăng nhập -> Xem /me -> Cập nhật /me -> Xoay vòng Refresh Token -> Đăng xuất -> Thu hồi an toàn.
    /// </summary>
    [Fact]
    public async Task E2E_Full_User_Lifecycle_And_Pending_Jobs_Flow()
    {
        var email = GenerateTestEmail();
        const string password = ApiFixture.Password;
        const string initialDisplayName = "Lâm Văn Đức E2E";

        // Bước 1: Đăng ký tài khoản mới (FR-AUTH-001)
        var registerResponse = await app.Guest.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password,
            displayName = initialDisplayName,
            userName = "duc_e2e_" + Guid.NewGuid().ToString("N")[..8]
        });

        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);
        var registerData = await ApiFixture.DataAsync(registerResponse);

        var accessToken1 = registerData.GetProperty("accessToken").GetString();
        var refreshToken1 = registerData.GetProperty("refreshToken").GetString();
        var userId = registerData.GetProperty("user").GetProperty("id").GetString();

        Assert.NotNull(accessToken1);
        Assert.NotNull(refreshToken1);
        Assert.NotNull(userId);

        // Bước 2: Kiểm tra database - intent PendingJob.Welcome được ghi nhận thành công (FR-JOB-001 & R08)
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
            var welcomeJob = await db.PendingJobs
                .FirstOrDefaultAsync(j => j.Kind == "welcome" && j.UserId == userId);
            Assert.NotNull(welcomeJob);

            // Kiểm tra token hash trong bảng RefreshTokens: tuyệt đối không lưu plain-text token (SRS 7.8)
            var tokenEntity = await db.RefreshTokens
                .FirstOrDefaultAsync(r => r.UserId == userId);
            Assert.NotNull(tokenEntity);
            Assert.False(string.IsNullOrEmpty(tokenEntity.TokenHash));
            Assert.NotEqual(refreshToken1, tokenEntity.TokenHash);
        }

        // Bước 3: Xem thông tin cá nhân /api/v1/auth/me (FR-AUTH-006)
        using var client = app.ClientFor(registerData);
        var meResponse = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
        var meData = await ApiFixture.DataAsync(meResponse);

        Assert.Equal(email, meData.GetProperty("email").GetString());
        Assert.Equal(initialDisplayName, meData.GetProperty("displayName").GetString());
        // Bảo mật: không bao giờ để lộ PasswordHash ra ngoài DTO
        Assert.False(meData.TryGetProperty("passwordHash", out _));

        // Bước 4: Cập nhật thông tin hồ sơ (FR-AUTH-007)
        const string updatedDisplayName = "Lâm Văn Đức (Auth Lead)";
        const string updatedBio = "Phụ trách An toàn & Xác thực hệ thống Culinary Blog";
        var updateResponse = await client.PatchAsJsonAsync("/api/v1/auth/me", new
        {
            displayName = updatedDisplayName,
            bio = updatedBio
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updatedData = await ApiFixture.DataAsync(updateResponse);
        Assert.Equal(updatedDisplayName, updatedData.GetProperty("displayName").GetString());
        Assert.Equal(updatedBio, updatedData.GetProperty("bio").GetString());

        // Bước 5: Xoay vòng Refresh Token - Token Rotation (FR-AUTH-004 & R19)
        var refreshResponse = await app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new
        {
            refreshToken = refreshToken1
        });
        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
        var refreshData = await ApiFixture.DataAsync(refreshResponse);
        var refreshToken2 = refreshData.GetProperty("refreshToken").GetString();

        Assert.NotNull(refreshToken2);
        // Rotation: token mới phải khác token ban đầu
        Assert.NotEqual(refreshToken1, refreshToken2);

        // Bước 6: Đăng xuất và thu hồi phiên làm việc (FR-AUTH-005)
        var logoutResponse = await client.PostAsJsonAsync("/api/v1/auth/logout", new
        {
            refreshToken = refreshToken2
        });
        Assert.Equal(HttpStatusCode.NoContent, logoutResponse.StatusCode);

        // Bước 7: Thử dùng lại Refresh Token sau khi đã đăng xuất -> Bị từ chối 401 Unauthorized
        var reuseAfterLogoutResponse = await app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new
        {
            refreshToken = refreshToken2
        });
        Assert.Equal(HttpStatusCode.Unauthorized, reuseAfterLogoutResponse.StatusCode);
    }

    /// <summary>
    /// Kịch bản E2E 2 (Bảo mật nâng cao): Kiểm thử tấn công phát hiện sử dụng lại Refresh Token (Token Reuse Detection).
    /// Khi một refresh token cũ đã bị xoay vòng (đã thu hồi) được gửi lại:
    /// -> Hệ thống kích hoạt Reuse Detection.
    /// -> Toàn bộ token family liên quan bị thu hồi ngay lập tức (Fail-Closed).
    /// -> Các token mới sinh trước đó cũng bị vô hiệu hóa.
    /// </summary>
    [Fact]
    public async Task Token_Reuse_Attack_Triggers_Reuse_Detection_And_Invalidates_Entire_Token_Family()
    {
        var email = GenerateTestEmail();
        var session = await app.RegisterAsync(email);
        var token1 = session.GetProperty("refreshToken").GetString()!;

        // 1. Thực hiện xoay vòng token hợp lệ lần đầu: Token1 -> Token2
        var refresh1Response = await app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = token1 });
        Assert.Equal(HttpStatusCode.OK, refresh1Response.StatusCode);
        var refresh1Data = await ApiFixture.DataAsync(refresh1Response);
        var token2 = refresh1Data.GetProperty("refreshToken").GetString()!;
        Assert.NotEqual(token1, token2);

        // 2. Kẻ tấn công cố tình gửi lại Token1 cũ đã bị xoay vòng (Token Reuse Attack)
        var attackResponse = await app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = token1 });

        // Kết quả mong đợi: Bị từ chối 401 Unauthorized theo RFC 7807
        Assert.Equal(HttpStatusCode.Unauthorized, attackResponse.StatusCode);
        Assert.Equal("application/problem+json", attackResponse.Content.Headers.ContentType?.MediaType);

        // 3. Kiểm tra tính năng Reuse Detection: Token2 (dù hợp lệ trước đó) cũng đã bị thu hồi do cảnh báo an ninh
        var victimRefreshResponse = await app.Guest.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = token2 });
        Assert.Equal(HttpStatusCode.Unauthorized, victimRefreshResponse.StatusCode);

        // 4. Kiểm tra trong database: Tất cả tokens thuộc user này đều bị đánh dấu IsRevoked = true
        var userId = session.GetProperty("user").GetProperty("id").GetString()!;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
            var allUserTokens = await db.RefreshTokens.Where(t => t.UserId == userId).ToListAsync();
            Assert.NotEmpty(allUserTokens);
            Assert.All(allUserTokens, t => Assert.True(t.IsRevoked, "Mọi token trong family phải bị thu hồi khi có dấu hiệu tấn công reuse"));
        }
    }

    /// <summary>
    /// Kịch bản E2E 3: Kiểm tra định dạng chuẩn RFC 7807 ProblemDetails và Security Headers trên toàn bộ các mã lỗi phân hệ Auth:
    /// - 400 Bad Request: Dữ liệu validation không hợp lệ.
    /// - 401 Unauthorized: Mật khẩu sai hoặc token không hợp lệ.
    /// - 409 Conflict: Trùng lặp email đăng ký.
    /// </summary>
    [Fact]
    public async Task RFC7807_ProblemDetails_And_Security_Headers_On_Auth_Endpoints()
    {
        // 1. Test 400 Bad Request (Validation failure)
        var badRegister = await app.Guest.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = "invalid-email-format",
            password = "123", // Quá ngắn
            displayName = ""
        });
        Assert.Equal(HttpStatusCode.BadRequest, badRegister.StatusCode);
        Assert.Equal("application/problem+json", badRegister.Content.Headers.ContentType?.MediaType);

        var badJson = await badRegister.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(400, badJson.GetProperty("status").GetInt32());
        Assert.Equal("VALIDATION_FAILED", badJson.GetProperty("errorCode").GetString());
        Assert.True(badJson.TryGetProperty("errors", out _));

        // 2. Test 401 Unauthorized (Sai mật khẩu)
        var email = GenerateTestEmail();
        await app.RegisterAsync(email);

        var wrongPasswordResponse = await app.Guest.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email,
            password = "IncorrectPassword@999"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, wrongPasswordResponse.StatusCode);
        Assert.Equal("application/problem+json", wrongPasswordResponse.Content.Headers.ContentType?.MediaType);

        var unauthorizedJson = await wrongPasswordResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(401, unauthorizedJson.GetProperty("status").GetInt32());
        Assert.Equal("HTTP_401", unauthorizedJson.GetProperty("errorCode").GetString());

        // 3. Test 409 Conflict (Trùng email)
        var duplicateResponse = await app.Guest.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password = ApiFixture.Password,
            displayName = "Trùng Email"
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        Assert.Equal("application/problem+json", duplicateResponse.Content.Headers.ContentType?.MediaType);

        var conflictJson = await duplicateResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(409, conflictJson.GetProperty("status").GetInt32());
        Assert.Equal("RESOURCE_CONFLICT", conflictJson.GetProperty("errorCode").GetString());

        // 4. Kiểm tra các Security Headers trên endpoint Auth
        var headers = badRegister.Headers;
        Assert.Equal("nosniff", headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("strict-origin-when-cross-origin", headers.GetValues("Referrer-Policy").Single());
        Assert.True(headers.Contains("Permissions-Policy"));
    }

    /// <summary>
    /// Kịch bản E2E 4: Kiểm tra cơ chế Rate Limiting chống Brute-Force trên endpoint Login (D7 & R20):
    /// Khi gửi request vượt ngưỡng cấu hình:
    /// - Nhận HTTP 429 Too Many Requests.
    /// - Định dạng lỗi RFC 7807 (errorCode: RATE_LIMIT_EXCEEDED).
    /// - Có đầy đủ các header: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining = 0.
    /// </summary>
    [Fact]
    public async Task Rate_Limiting_On_Login_Endpoint_Enforces_D7_Policy()
    {
        // Cấu hình limiter Login = 3 req/phút cho ca test này
        using var customApp = app.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimits:Login"] = "3"
            })));

        using var client = customApp.CreateClient();
        var email = GenerateTestEmail();

        // 3 request đầu tiên bị 401 Unauthorized do sai mật khẩu
        for (var i = 0; i < 3; i++)
        {
            var res = await client.PostAsJsonAsync("/api/v1/auth/login", new
            {
                email,
                password = "BadPassword@123"
            });
            Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        }

        // Request thứ 4 vượt ngưỡng 3 req/phút -> Phải bị chặn với HTTP 429 Too Many Requests
        var rateLimitedResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email,
            password = "BadPassword@123"
        });

        Assert.Equal(HttpStatusCode.TooManyRequests, rateLimitedResponse.StatusCode);
        Assert.Equal("application/problem+json", rateLimitedResponse.Content.Headers.ContentType?.MediaType);

        var problem = await rateLimitedResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(429, problem.GetProperty("status").GetInt32());
        Assert.Equal("RATE_LIMIT_EXCEEDED", problem.GetProperty("errorCode").GetString());

        // Kiểm tra đầy đủ bộ headers điều tiết
        Assert.True(rateLimitedResponse.Headers.Contains("Retry-After"));
        Assert.Equal("3", rateLimitedResponse.Headers.GetValues("X-RateLimit-Limit").Single());
        Assert.Equal("0", rateLimitedResponse.Headers.GetValues("X-RateLimit-Remaining").Single());
    }
}
