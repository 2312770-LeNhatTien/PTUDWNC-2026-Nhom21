using System.Security.Cryptography;
using System.Text.Json;
using CulinaryBlog.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Application.Common.Behaviors;

public sealed class CachingBehavior<TRequest, TResponse>(ICacheService cache, ICacheVersionProvider versions,
    ICurrentUser user, ILogger<CachingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // Query có thể trả Draft cho owner: phiên có đăng nhập luôn đi DB, không dùng cache Guest.
        if (request is not ICacheableQuery policy || user.IsAuthenticated) return await next();
        var revision = await versions.GetAsync(cancellationToken);
        var hash = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(request)));
        var key = $"public:{revision}:{typeof(TRequest).Name}:{hash}";
        var cached = await cache.GetAsync<TResponse>(key, cancellationToken);
        if (cached is not null)
        {
            logger.LogInformation("Public cache {CacheStatus} {Query}", "HIT", typeof(TRequest).Name);
            return cached;
        }
        var response = await next();
        await cache.SetAsync(key, response, policy.CacheDuration, cancellationToken);
        logger.LogInformation("Public cache {CacheStatus} {Query}", "MISS", typeof(TRequest).Name);
        return response;
    }
}
