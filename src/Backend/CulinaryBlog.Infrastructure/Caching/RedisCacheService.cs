using System.Text.Json;
using CulinaryBlog.Application.Common.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace CulinaryBlog.Infrastructure.Caching;

public sealed class RedisCacheService(
    IDistributedCache cache,
    IConnectionMultiplexer redis,
    ILogger<RedisCacheService> logger) : ICacheService
{
    public const string InstanceName = "culinaryblog:";

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        var bytes = await cache.GetAsync(key, ct);
        if (bytes is null) return default;
        try
        {
            return JsonSerializer.Deserialize<T>(bytes);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Discarding invalid cache entry {CacheKey}", key);
            await cache.RemoveAsync(key, ct);
            return default;
        }
    }

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        if (ttl <= TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(ttl));
        return cache.SetAsync(key, JsonSerializer.SerializeToUtf8Bytes(value),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl }, ct);
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
        => cache.RemoveAsync(key, ct);

    // SCAN on every primary supports multiple API instances without an in-memory key registry.
    // Only this application's namespace is deleted; never flush the shared Redis database.
    public async Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(prefix);
        prefix = prefix.TrimEnd('*');
        if (prefix.Length == 0 || prefix.IndexOfAny(['*', '?', '[', ']', '\\']) >= 0)
            throw new ArgumentException("Use a literal, non-empty prefix with an optional trailing *.", nameof(prefix));

        var database = redis.GetDatabase();
        foreach (var endpoint in redis.GetEndPoints())
        {
            var server = redis.GetServer(endpoint);
            if (!server.IsConnected || server.IsReplica) continue;
            var batch = new List<RedisKey>(128);
            await foreach (var key in server.KeysAsync(database.Database, InstanceName + prefix + "*", pageSize: 128)
                .WithCancellation(ct))
            {
                batch.Add(key);
                if (batch.Count < 128) continue;
                await database.KeyDeleteAsync(batch.ToArray()).WaitAsync(ct);
                batch.Clear();
            }
            if (batch.Count > 0) await database.KeyDeleteAsync(batch.ToArray()).WaitAsync(ct);
        }
        logger.LogInformation("Invalidated cache prefix {CachePrefix}", prefix);
    }
}
