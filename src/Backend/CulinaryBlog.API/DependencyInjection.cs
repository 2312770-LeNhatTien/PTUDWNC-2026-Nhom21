using CulinaryBlog.API.Middleware;

namespace CulinaryBlog.API;

// SRS mục 6.2 - extension method AddPresentation() gom cấu hình của tầng
// Presentation (OpenAPI, exception handler, CORS).
public static class DependencyInjection
{
    public static IServiceCollection AddPresentation(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOpenApi();
        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

        // CONS-005: mọi lỗi trả về theo RFC 7807.
        services.AddExceptionHandler<GlobalExceptionMiddleware>();
        services.AddProblemDetails();

        // ── CORS (SRS mục 5.2) ───────────────────────────────────────────────
        services.AddCors(options =>
        {
            options.AddPolicy("NextJsPolicy", policy =>
            {
                var origins = configuration.GetSection("AllowedOrigins").Get<string[]>()
                    ?? new[] { "http://localhost:3000" };

                policy.WithOrigins(origins)
                    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .WithHeaders("Authorization", "Content-Type", "X-Correlation-ID")
                    .AllowCredentials();
            });
        });

        // ── Rate Limiting (DECISIONS D7 & NFR-SEC-003) ────────────────────────
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, token) =>
            {
                context.HttpContext.Response.ContentType = "application/problem+json";
                if (context.Lease.TryGetMetadata(System.Threading.RateLimiting.MetadataName.RetryAfter, out TimeSpan retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
                }
                else
                {
                    context.HttpContext.Response.Headers.RetryAfter = "60";
                }

                var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
                {
                    Type = "about:blank",
                    Title = "Quá nhiều yêu cầu.",
                    Status = StatusCodes.Status429TooManyRequests,
                    Detail = "Bạn đã gửi quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút.",
                    Instance = context.HttpContext.Request.Path
                };
                problem.Extensions["errorCode"] = "RATE_LIMIT_EXCEEDED";

                await context.HttpContext.Response.WriteAsJsonAsync(problem, token);
            };

            // FR-AUTH-002 / DECISIONS D7: Endpoint login giới hạn 5 request/phút theo IP
            options.AddPolicy("LoginRateLimitPolicy", httpContext =>
                System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));
        });

        return services;
    }
}
