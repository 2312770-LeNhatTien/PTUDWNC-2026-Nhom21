using System.Text;
using StackExchange.Redis;
using Amazon.S3;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Interfaces;
using CulinaryBlog.Domain.Settings;
using CulinaryBlog.Infrastructure.Caching;
using CulinaryBlog.Infrastructure.Persistence;
using CulinaryBlog.Infrastructure.Persistence.Repositories;
using CulinaryBlog.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
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
        });
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
        });

        // ── Authorization: Role-based cơ bản ────────────────────────────────
        services.AddAuthorizationBuilder()
            .AddPolicy("AdminOnly", p => p.RequireRole("Admin"))
            .AddPolicy("AuthorOrAdmin", p => p.RequireRole("Author", "Admin"));

        // ── Redis Distributed Cache ──────────────────────────────────────────
        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(
            configuration.GetConnectionString("Redis") ?? "localhost:6379"));
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

        return services;
    }
}
