using CulinaryBlog.API;
using CulinaryBlog.API.Endpoints;
using CulinaryBlog.Application;
using CulinaryBlog.Infrastructure;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Hangfire;

var builder = WebApplication.CreateBuilder(args);
if (builder.Configuration.GetSection("Seq").Exists())
    builder.Logging.AddSeq(builder.Configuration.GetSection("Seq"));

// ── Đăng ký service theo từng tầng (SRS mục 6.2) ──────────────────────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPresentation(builder.Configuration);

var app = builder.Build();

// ── Chỉ chạy ở Development: áp dụng migration + tạo sẵn 2 role ────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options => options.WithTitle("Culinary Blog API"));

    // Redirect root va swagger ve Scalar API Docs
    app.MapGet("/", () => Results.Redirect("/scalar/v1"));
    app.MapGet("/swagger", () => Results.Redirect("/scalar/v1"));
    app.MapGet("/swagger/index.html", () => Results.Redirect("/scalar/v1"));
    app.MapGet("/scalar", () => Results.Redirect("/scalar/v1"));

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
    await db.Database.MigrateAsync();

    await DatabaseSeeder.SeedAsync(app.Services);
}

// ── Middleware pipeline - THỨ TỰ RẤT QUAN TRỌNG, đừng đảo lộn ─────────────
app.UseExceptionHandler();

// Dev chạy HTTP cổng 5000 (SRS mục 5.2). Production mới dùng HTTPS và do
// Nginx đảm nhiệm SSL termination (SRS mục 6.5).
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("NextJsPolicy");   // CORS phải đứng trước Authentication
app.UseRateLimiter();          // Giới hạn tần suất request (DECISIONS D7 & NFR-SEC-003)
app.UseAuthentication();       // xác thực trước
app.UseAuthorization();        // rồi mới phân quyền

// ── Endpoint của từng module ──────────────────────────────────────────────
app.MapAuthEndpoints();        // FR-AUTH-001 (đăng ký tài khoản)
app.MapCategoriesEndpoints();  // FR-CAT  (SRS mục 8.2)
app.MapRecipesEndpoints();     // FR-RCP + FR-SRCH (SRS mục 8.3 - 8.6)
app.MapFilesEndpoints();       // FR-FILE-001 + FR-FILE-002 (Upload/Delete MinIO)

// TODO (người phụ trách FR-OBS-001): map endpoint kiểm tra sức khỏe tại /health
// FR-JOB-001 / FR-JOB: Map dashboard Hangfire tại /hangfire để giám sát background jobs
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    DashboardTitle = "Culinary Blog - Hangfire Dashboard",
    Authorization = new[] { new HangfireDevAuthorizationFilter() }
});

app.Run();

/// <summary>
/// Bộ lọc cho phép truy cập Hangfire Dashboard trong môi trường phát triển (Development).
/// Phục vụ giám sát các background jobs (FR-JOB-001 Welcome Email, FR-JOB-002 Thumbnail).
/// </summary>
public class HangfireDevAuthorizationFilter : Hangfire.Dashboard.IDashboardAuthorizationFilter
{
    public bool Authorize(Hangfire.Dashboard.DashboardContext context) => true;
}
