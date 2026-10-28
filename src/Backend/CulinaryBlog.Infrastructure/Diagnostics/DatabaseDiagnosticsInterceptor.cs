using System.Collections.Concurrent;
using System.Data.Common;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Infrastructure.Diagnostics;

public sealed class DatabaseDiagnosticsInterceptor(ILogger<DatabaseDiagnosticsInterceptor> logger) : DbCommandInterceptor
{
    public static readonly ActivitySource Source = new("CulinaryBlog.Database");
    private readonly ConcurrentDictionary<Guid, Activity> _activities = new();
    private void Start(CommandEventData eventData)
    {
        // Trace loại truy vấn, không ghi SQL/parameter chứa dữ liệu riêng tư.
        var activity = Source.StartActivity("PostgreSQL query", ActivityKind.Client);
        if (activity != null) { activity.SetTag("db.system.name", "postgresql"); _activities[eventData.CommandId] = activity; }
    }
    private void Stop(CommandEndEventData eventData, bool failed = false)
    {
        if (_activities.TryRemove(eventData.CommandId, out var activity))
        {
            if (failed) activity.SetStatus(ActivityStatusCode.Error);
            activity.Dispose();
        }
        if (eventData.Duration.TotalMilliseconds > 100)
            logger.LogWarning("Truy vấn chậm {CommandId}: {ElapsedMs} ms", eventData.CommandId, eventData.Duration.TotalMilliseconds);
    }
    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
        CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
    { Start(eventData); return ValueTask.FromResult(result); }
    public override ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData,
        DbDataReader result, CancellationToken cancellationToken = default)
    { Stop(eventData); return ValueTask.FromResult(result); }
    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command,
        CommandEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    { Start(eventData); return ValueTask.FromResult(result); }
    public override ValueTask<int> NonQueryExecutedAsync(DbCommand command, CommandExecutedEventData eventData,
        int result, CancellationToken cancellationToken = default)
    { Stop(eventData); return ValueTask.FromResult(result); }
    public override Task CommandFailedAsync(DbCommand command, CommandErrorEventData eventData, CancellationToken cancellationToken = default)
    { Stop(eventData, true); return Task.CompletedTask; }
}
