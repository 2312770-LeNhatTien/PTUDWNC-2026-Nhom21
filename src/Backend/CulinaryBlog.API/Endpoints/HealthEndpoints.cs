using Microsoft.AspNetCore.Diagnostics.HealthChecks;

namespace CulinaryBlog.API.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/health").WithTags("Health").AllowAnonymous();
        group.MapHealthChecks("").WithName("GetHealth");
        // Liveness độc lập dịch vụ ngoài; readiness chỉ yêu cầu PostgreSQL/Redis.
        group.MapHealthChecks("/live", new HealthCheckOptions { Predicate = _ => false }).WithName("GetLiveness");
        group.MapHealthChecks("/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") })
            .WithName("GetReadiness");
    }
}
