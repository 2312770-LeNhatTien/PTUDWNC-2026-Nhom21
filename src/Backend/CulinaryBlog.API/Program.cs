using CulinaryBlog.API;
using CulinaryBlog.API.Endpoints;
using CulinaryBlog.Application;
using CulinaryBlog.Infrastructure;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using CulinaryBlog.API.Middleware;
using Serilog;
using Serilog.Formatting.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((context, config) =>
{
    config.MinimumLevel.Information()
        // Query chậm đã được interceptor đo; tránh ghi toàn bộ SQL mỗi request làm nghẽn I/O.
        .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
        .MinimumLevel.Override("Npgsql", Serilog.Events.LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .WriteTo.Console(new JsonFormatter())
        .WriteTo.File(new JsonFormatter(), "logs/api-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 7);
    var seq = context.Configuration["Seq:ServerUrl"];
    if (!string.IsNullOrWhiteSpace(seq)) config.WriteTo.Seq(seq);
});

// ── Đăng ký service theo từng tầng (SRS mục 6.2) ──────────────────────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPresentation(builder.Configuration, builder.Environment);

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

    if (app.Configuration.GetValue("Database:InitializeOnStartup", true))
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
        await db.Database.MigrateAsync();

        await DatabaseSeeder.SeedAsync(app.Services);
    }
}

// ── Middleware pipeline - THỨ TỰ RẤT QUAN TRỌNG, đừng đảo lộn ─────────────
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
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

app.MapHealthEndpoints();      // FR-OBS-001: health/liveness/readiness
app.MapJobsEndpoints();       // FR-JOB-002 (Nén ảnh thumbnail) + FR-JOB-003 (Sitemap) + Dashboard Admin

await app.RunAsync();

public partial class Program { protected Program() { } }
