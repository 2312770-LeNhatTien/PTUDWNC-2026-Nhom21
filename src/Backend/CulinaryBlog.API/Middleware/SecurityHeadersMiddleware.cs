namespace CulinaryBlog.API.Middleware;

/// <summary>
/// P02: headers owned by the API response. UI-specific CSP is configured in Next.js.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next, IHostEnvironment environment)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Use OnStarting because UseExceptionHandler can clear the response after
        // downstream code throws. The callback therefore covers both success and
        // RFC 7807 error responses, including requests behind a trusted proxy.
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

            if (!environment.IsDevelopment() && context.Request.IsHttps)
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

            return Task.CompletedTask;
        });

        await next(context);
    }
}
