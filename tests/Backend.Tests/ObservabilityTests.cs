using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using CulinaryBlog.Infrastructure.Health;
using CulinaryBlog.Application.Common.Behaviors;
using CulinaryBlog.Infrastructure.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StackExchange.Redis;

namespace CulinaryBlog.Tests;

[Collection("api")]
public sealed class ObservabilityTests(ApiFixture app)
{
    [Fact]
    public async Task Health_routes_keep_liveness_healthy_when_dependency_is_down()
    {
        foreach (var path in new[] { "/health", "/health/live", "/health/ready" })
            Assert.Equal(HttpStatusCode.OK, (await app.Guest.GetAsync(path)).StatusCode);
        var offline = new Mock<IConnectionMultiplexer>();
        offline.Setup(x => x.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Throws(new IOException("Redis offline (test)"));
        using var factory = app.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IConnectionMultiplexer>();
            services.AddSingleton(offline.Object);
        }));
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live")).StatusCode);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/health/ready")).StatusCode);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/health")).StatusCode);
    }

    [Fact]
    public async Task Correlation_id_is_echoed_or_replaced_and_liveness_stays_independent()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health/live");
        request.Headers.Add("X-Correlation-ID", "test-request-123");
        var response = await app.Guest.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("test-request-123", response.Headers.GetValues("X-Correlation-ID").Single());
        using var invalid = new HttpRequestMessage(HttpMethod.Get, "/health/live");
        invalid.Headers.Add("X-Correlation-ID", new string('x', 100));
        var replaced = await app.Guest.SendAsync(invalid);
        Assert.Equal(32, replaced.Headers.GetValues("X-Correlation-ID").Single().Length);
    }

    [Fact]
    public async Task Dependency_checks_report_failures_without_exposing_credentials()
    {
        var redis = new Mock<IConnectionMultiplexer>();
        redis.Setup(x => x.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Throws(new IOException("private redis credentials"));
        var cacheHealth = await new RedisHealthCheck(redis.Object).CheckHealthAsync(new HealthCheckContext());
        Assert.Equal(HealthStatus.Unhealthy, cacheHealth.Status);
        Assert.DoesNotContain("credentials", cacheHealth.Description);
        var s3 = new Mock<IAmazonS3>();
        s3.Setup(x => x.ListBucketsAsync(It.IsAny<ListBucketsRequest>(), It.IsAny<CancellationToken>())).ThrowsAsync(new IOException("private S3 credentials"));
        var storageHealth = await new StorageHealthCheck(s3.Object).CheckHealthAsync(new HealthCheckContext());
        Assert.Equal(HealthStatus.Unhealthy, storageHealth.Status);
        Assert.DoesNotContain("credentials", storageHealth.Description);
    }

    [Fact]
    public async Task Handler_and_database_emit_traces_and_handler_metrics()
    {
        var stopped = new List<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name.StartsWith("CulinaryBlog", StringComparison.Ordinal),
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
            ActivityStopped = stopped.Add
        };
        ActivitySource.AddActivityListener(listener);
        var measurements = 0;
        using var meterListener = new MeterListener();
        meterListener.InstrumentPublished = (instrument, active) => { if (instrument.Meter.Name.StartsWith("CulinaryBlog", StringComparison.Ordinal)) active.EnableMeasurementEvents(instrument); };
        meterListener.SetMeasurementEventCallback<double>((_, _, _, _) => measurements++);
        meterListener.Start();
        var handler = new LoggingBehavior<string, string>(NullLogger<LoggingBehavior<string, string>>.Instance);
        await handler.Handle("test request", () => Task.FromResult("done"), default);
        using var scope = app.Services.CreateScope();
        var interceptor = new DatabaseDiagnosticsInterceptor(NullLogger<DatabaseDiagnosticsInterceptor>.Instance);
        var options = new DbContextOptionsBuilder<CulinaryBlog.Infrastructure.Persistence.CulinaryBlogDbContext>()
            .UseNpgsql(app.ConnectionString).AddInterceptors(interceptor).Options;
        await using var db = new CulinaryBlog.Infrastructure.Persistence.CulinaryBlogDbContext(options);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_sleep(0.11)");
        Assert.Contains(stopped, activity => activity.Source.Name == "CulinaryBlog.Database");
        Assert.Contains(stopped, activity => activity.Source.Name == "CulinaryBlog.Application");
        Assert.True(measurements > 0);
    }
}
