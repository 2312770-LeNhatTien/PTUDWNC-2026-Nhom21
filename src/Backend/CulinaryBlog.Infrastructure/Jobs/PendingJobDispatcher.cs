using CulinaryBlog.Application.Common.Interfaces;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Infrastructure.Jobs;

// Dispatcher chỉ chuyển công việc đã commit sang Hangfire; queue lỗi sẽ thử lại lượt sau.
public sealed class PendingJobDispatcher(IServiceScopeFactory scopes, JobStorage storage,
    ILogger<PendingJobDispatcher> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        do
        {
            try
            {
                using var connection = storage.GetConnection();
                using var gate = connection.AcquireDistributedLock("pending-jobs:dispatch", TimeSpan.FromSeconds(2));
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var client = scope.ServiceProvider.GetRequiredService<IBackgroundJobClient>();
                var jobs = await db.PendingJobs.Where(x => x.HangfireJobId == null && x.CompletedAt == null)
                    .OrderBy(x => x.CreatedAt).Take(100).ToListAsync(stoppingToken);
                foreach (var job in jobs)
                {
                    var id = job.Kind switch
                    {
                        "welcome" => client.Enqueue<PendingJobWorker>(w => w.SendWelcomeAsync(job.Id, CancellationToken.None)),
                        "resize" => client.Enqueue<PendingJobWorker>(w => w.ResizeAsync(job.Id, CancellationToken.None)),
                        _ => client.Enqueue<PendingJobWorker>(w => w.DeleteAsync(job.Id, CancellationToken.None))
                    };
                    job.Scheduled(id);
                    await db.SaveChangesAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogWarning(ex, "Chưa đưa được việc chờ vào queue; sẽ thử lại."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
