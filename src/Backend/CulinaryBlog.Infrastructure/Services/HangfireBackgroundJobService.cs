using System.Linq.Expressions;
using CulinaryBlog.Application.Common.Interfaces;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using CulinaryBlog.Infrastructure.Jobs;

namespace CulinaryBlog.Infrastructure.Services;

/// <summary>
/// Hiện thực IBackgroundJobService sử dụng Hangfire.
/// </summary>
public class HangfireBackgroundJobService : IBackgroundJobService
{
    private readonly IBackgroundJobClient _backgroundJobClient;

    public HangfireBackgroundJobService(IBackgroundJobClient backgroundJobClient)
    {
        _backgroundJobClient = backgroundJobClient;
    }

    public string Enqueue<T>(Expression<Func<T, Task>> methodCall)
    {
        var job = Job.FromExpression(methodCall);
        // Serialize implementation để Hangfire đọc đúng retry/queue thay vì method interface.
        if (typeof(T) == typeof(IImageResizeJob))
            job = new Job(typeof(ImageResizeJob), typeof(ImageResizeJob).GetMethod(job.Method.Name)!, job.Args);
        return _backgroundJobClient.Create(job, new EnqueuedState(typeof(T) == typeof(IImageResizeJob) ? "images" : "default"));
    }

    public string Enqueue<T>(Expression<Action<T>> methodCall)
    {
        return _backgroundJobClient.Enqueue(methodCall);
    }
}
