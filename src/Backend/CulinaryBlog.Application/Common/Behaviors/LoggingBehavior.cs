using System.Diagnostics;
using System.Diagnostics.Metrics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Application.Common.Behaviors;

public class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    private static readonly ActivitySource Source = new("CulinaryBlog.Application");
    private static readonly Meter Meter = new("CulinaryBlog.Application");
    private static readonly Histogram<double> Duration = Meter.CreateHistogram<double>("handler.duration", "ms");
    private static readonly Counter<long> Errors = Meter.CreateCounter<long>("handler.errors");
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var name = typeof(TRequest).Name;
        using var activity = Source.StartActivity(name);
        var timer = Stopwatch.StartNew();
        try { return await next(); }
        catch
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            Errors.Add(1, new KeyValuePair<string, object?>("handler", name));
            throw;
        }
        finally
        {
            // Đo cả request lỗi, không log body chứa mật khẩu/token của command.
            var elapsed = timer.Elapsed.TotalMilliseconds;
            Duration.Record(elapsed, new KeyValuePair<string, object?>("handler", name));
            if (elapsed > 500) logger.LogWarning("Handler chậm {RequestName}: {ElapsedMs} ms", name, elapsed);
            else logger.LogInformation("Hoàn tất {RequestName}: {ElapsedMs} ms", name, elapsed);
        }
    }
}
