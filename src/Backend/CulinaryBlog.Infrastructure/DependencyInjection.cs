using Hangfire;
using Hangfire.PostgreSql;
using CulinaryBlog.Infrastructure.Jobs;
using System.Text;
using StackExchange.Redis;
using Amazon.S3;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Interfaces;
using CulinaryBlog.Domain.Settings;
using CulinaryBlog.Infrastructure.Caching;
using CulinaryBlog.Infrastructure.Health;
using CulinaryBlog.Infrastructure.Diagnostics;
using CulinaryBlog.Infrastructure.Persistence;
using CulinaryBlog.Infrastructure.Persistence.Repositories;
using CulinaryBlog.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CulinaryBlog.Infrastructure;

// Đăng ký toàn bộ service của tầng Infrastructure.
// Program.cs chỉ cần gọi builder.Services.AddInfrastructure(builder.Configuration).
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        // ── Database (PostgreSQL) ───────────────────────────────────────────
        services.AddDbContext<CulinaryBlogDbContext>((sp, options) =>
        {
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));
            options.AddInterceptors(sp.GetRequiredService<DatabaseDiagnosticsInterceptor>());
        });
        services.AddSingleton<DatabaseDiagnosticsInterceptor>();
        // Check dịch vụ ngoài được đăng ký cùng implementation hạ tầng.
        services.AddHealthChecks()
            .AddDbContextCheck<CulinaryBlogDbContext>("postgres", tags: new[] { "ready" })
            .AddCheck<RedisHealthCheck>("redis", tags: new[] { "ready" }, timeout: TimeSpan.FromSeconds(3))
            .AddCheck<StorageHealthCheck>("minio", timeout: TimeSpan.FromSeconds(3));
        services.AddScoped<IApplicationDbContext>(sp =>
            sp.GetRequiredService<CulinaryBlogDbContext>());

        // ── Repositories ─────────────────────────────────────────────────────
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IRecipeRepository, RecipeRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();

        // ── ASP.NET Core Identity (CONS-004: hash mật khẩu bằng PBKDF2) ──────
        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireNonAlphanumeric = false;

            // Khóa tạm tài khoản sau 5 lần nhập sai, chống dò mật khẩu.
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.AllowedForNewUsers = true;

            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<CulinaryBlogDbContext>()
        .AddDefaultTokenProviders();

        // ── JWT Authentication ───────────────────────────────────────────────
        var jwtSettings = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
            ?? throw new InvalidOperationException(
                "Thiếu cấu hình JwtSettings. Xem docs/SETUP.md để đặt JwtSettings:Key bằng dotnet user-secrets.");

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
                ClockSkew = TimeSpan.Zero,
            };
            options.Events = new JwtBearerEvents
            {
                OnChallenge = context =>
                {
                    context.HandleResponse();
                    return WriteAuthProblemAsync(
                        context.HttpContext,
                        StatusCodes.Status401Unauthorized,
                        "Chưa xác thực.",
                        "Bạn cần đăng nhập để thực hiện thao tác này.",
                        "UNAUTHORIZED");
                },
                OnForbidden = context =>
                {
                    context.HandleResponse();
                    return WriteAuthProblemAsync(
                        context.HttpContext,
                        StatusCodes.Status403Forbidden,
                        "Không có quyền truy cập.",
                        "Bạn không có quyền thực hiện thao tác này.",
                        "FORBIDDEN");
                }
            };
        });

        // ── Authorization: Role-based cơ bản ────────────────────────────────
        services.AddAuthorizationBuilder()
            .AddPolicy("AdminOnly", p => p.RequireRole("Admin"))
            .AddPolicy("AuthorOrAdmin", p => p.RequireRole("Author", "Admin"));

        // ── Redis Distributed Cache ──────────────────────────────────────────
        services.AddSingleton<IConnectionMultiplexer>(_ =>
        {
            var redis = ConfigurationOptions.Parse(configuration.GetConnectionString("Redis") ?? "localhost:6379");
            // Redis tạm lỗi không ngăn API khởi động; client sẽ tự kết nối lại.
            redis.AbortOnConnectFail = false;
            redis.ConnectTimeout = 1000;
            redis.AsyncTimeout = 1000;
            return ConnectionMultiplexer.Connect(redis);
        });
        services.AddStackExchangeRedisCache(_ => { });
        services.AddOptions<Microsoft.Extensions.Caching.StackExchangeRedis.RedisCacheOptions>()
            .Configure<IConnectionMultiplexer>((options, multiplexer) =>
        {
            options.Configuration = configuration.GetConnectionString("Redis");
            options.InstanceName = RedisCacheService.InstanceName;
            options.ConnectionMultiplexerFactory = () => Task.FromResult(
                multiplexer);
        });
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddScoped<ICacheVersionProvider, CacheVersionProvider>();

        // ── MinIO S3 Object Storage (FR-FILE-001) ──────────────────────────
        var minioEndpoint = configuration["MinIO:Endpoint"] ?? "localhost:9000";
        var minioAccessKey = configuration["MinIO:AccessKey"] ?? "minioadmin";
        var minioSecretKey = configuration["MinIO:SecretKey"] ?? "minioadmin";
        var minioUseSsl = configuration.GetValue<bool>("MinIO:UseSSL");

        var s3Config = new AmazonS3Config
        {
            ServiceURL = $"http{(minioUseSsl ? "s" : "")}://{minioEndpoint}",
            ForcePathStyle = true,
            UseHttp = !minioUseSsl
        };
        services.AddSingleton<IAmazonS3>(new AmazonS3Client(minioAccessKey, minioSecretKey, s3Config));

        // ── Các service khác ─────────────────────────────────────────────────
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUserService>();
        services.AddScoped<IFileStorageService, MinioFileStorageService>();
        // ── SMTP Email Service (FR-JOB-001) ─────────────────────────────────
        services.Configure<SmtpSettings>(configuration.GetSection(SmtpSettings.SectionName));
        services.AddScoped<IEmailService, MailKitEmailService>();

        services.AddOptions<SitemapOptions>().Bind(configuration.GetSection("Sitemap"))
            .Validate(o => !configuration.GetValue("Jobs:Enabled", true) || o.IsValid(), "Sitemap requires an absolute website origin, output directory and cron; Google submission requires a public HTTPS site.")
            .ValidateOnStart();
        services.AddHttpClient("SearchConsole", client => client.Timeout = TimeSpan.FromSeconds(30));
        services.AddHttpClient();

        if (configuration.GetValue("Jobs:Enabled", true))
        {
            var defaultConn = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Thiếu connection string DefaultConnection cho Hangfire.");

            services.AddHangfire(options => options
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UsePostgreSqlStorage(pg => pg.UseNpgsqlConnection(defaultConn)));

            services.AddHangfireServer(options =>
            {
                options.WorkerCount = Math.Clamp(Environment.ProcessorCount, 2, 4);
                options.Queues = new[] { "default", "images" };
            });

            services.AddScoped<SitemapJob>();
            services.AddScoped<IImageResizeJob, ImageResizeJob>();
            services.AddScoped<ImageResizeJob>();
            services.AddScoped<PendingJobWorker>();
            services.AddHostedService<PendingJobDispatcher>();
            services.AddScoped<IBackgroundJobService, HangfireBackgroundJobService>();
        }
        else services.AddScoped<IBackgroundJobService, DisabledBackgroundJobService>();

        return services;
    }

    private static async Task WriteAuthProblemAsync(
        HttpContext context,
        int status,
        string title,
        string detail,
        string errorCode)
    {
        if (context.Response.HasStarted) return;

        var problem = new ProblemDetails
        {
            Type = "about:blank",
            Title = title,
            Status = status,
            Detail = detail,
            Instance = context.Request.Path
        };
        problem.Extensions["errorCode"] = errorCode;
        if (context.Items.TryGetValue("CorrelationId", out var correlationId))
        {
            problem.Extensions["correlationId"] = correlationId;
            context.Response.Headers["X-Correlation-ID"] = correlationId?.ToString();
        }

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problem);
    }
}
