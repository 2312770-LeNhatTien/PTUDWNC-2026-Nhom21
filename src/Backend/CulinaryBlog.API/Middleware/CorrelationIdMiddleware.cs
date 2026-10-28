using System.Diagnostics;

namespace CulinaryBlog.API.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var incoming = context.Request.Headers["X-Correlation-ID"].ToString();
        // Chỉ giữ ID ngắn, an toàn cho header/log; không ghi nguyên input tùy ý.
        var id = incoming.Length is > 0 and <= 64 && incoming.All(c => char.IsAsciiLetterOrDigit(c) || c is '.' or '_' or '-')
            ? incoming : Guid.NewGuid().ToString("N");
        context.Items["CorrelationId"] = id;
        context.Response.Headers["X-Correlation-ID"] = id;
        Activity.Current?.SetTag("correlation.id", id);
        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
            await next(context);
    }
}
