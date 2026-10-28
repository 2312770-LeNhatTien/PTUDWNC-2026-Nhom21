namespace CulinaryBlog.API.Middleware;

/// <summary>
/// P02: headers owned by the API response. UI-specific CSP is configured in Next.js.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next, IHostEnvironment environment)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers.TryAdd("X-Content-Type-Options", "nosniff");
        headers.TryAdd("X-Frame-Options", "DENY");
        headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");
        headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        if (!environment.IsDevelopment() && context.Request.IsHttps)
            headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        await next(context);
    }
}
