using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CulinaryBlog.Infrastructure.Health;

public sealed class StorageHealthCheck(IAmazonS3 storage) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try { await storage.ListBucketsAsync(new ListBucketsRequest(), cancellationToken); return HealthCheckResult.Healthy(); }
        catch (Exception) { return HealthCheckResult.Unhealthy("Object storage chưa sẵn sàng."); }
    }
}
