using CulinaryBlog.Infrastructure.Caching;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

using var connection = await ConnectionMultiplexer.ConnectAsync(Environment.GetEnvironmentVariable("REDIS_CONNECTION") ?? "localhost:6379");
using var distributed = new RedisCache(Options.Create(new RedisCacheOptions {
    InstanceName = RedisCacheService.InstanceName,
    ConnectionMultiplexerFactory = () => Task.FromResult<IConnectionMultiplexer>(connection)
}));
var cache = new RedisCacheService(distributed, connection, NullLogger<RedisCacheService>.Instance);
var prefix = $"lab06:{Guid.NewGuid():N}:";
void Check(bool condition, string label) { if (!condition) throw new Exception(label); Console.WriteLine($"PASS: {label}"); }
try {
    Check(await cache.GetAsync<string>(prefix + "missing") is null, "cache miss");
    await cache.SetAsync(prefix + "a", new[] { "Phở bò", "Bún chả" }, TimeSpan.FromMinutes(30));
    Check((await cache.GetAsync<string[]>(prefix + "a"))![0] == "Phở bò", "UTF-8 round trip");
    var ttl = await connection.GetDatabase().KeyTimeToLiveAsync(RedisCacheService.InstanceName + prefix + "a");
    Check(ttl > TimeSpan.FromMinutes(29) && ttl <= TimeSpan.FromMinutes(30), "absolute TTL 30 minutes");
    await cache.SetAsync(prefix + "short", "expires", TimeSpan.FromMilliseconds(100));
    await Task.Delay(200);
    Check(await cache.GetAsync<string>(prefix + "short") is null, "expiration");
    await cache.SetAsync(prefix + "b", "delete", TimeSpan.FromMinutes(1));
    await cache.RemoveAsync(prefix + "b");
    Check(await cache.GetAsync<string>(prefix + "b") is null, "remove exact key");
    await cache.SetAsync(prefix + "outside", "keep", TimeSpan.FromMinutes(1));
    for (var i = 0; i < 260; i++) await cache.SetAsync(prefix + "batch:" + i, i, TimeSpan.FromMinutes(1));
    await cache.RemoveByPrefixAsync(prefix + "batch:*");
    for (var i = 0; i < 260; i++)
        if (await cache.GetAsync<int?>(prefix + "batch:" + i) is not null) throw new Exception("Prefix key survived: " + i);
    Console.WriteLine("PASS: prefix deletion across SCAN pages (all 260 keys)");
    Check(await cache.GetAsync<string>(prefix + "outside") == "keep", "prefix isolation");
    await connection.GetDatabase().HashSetAsync(RedisCacheService.InstanceName + prefix + "corrupt", "data", "invalid-json");
    Check(await cache.GetAsync<string>(prefix + "corrupt") is null, "invalid JSON eviction");
    try { await cache.RemoveByPrefixAsync("*"); throw new Exception("Unsafe prefix accepted"); }
    catch (ArgumentException) { Console.WriteLine("PASS: reject global wildcard"); }
    using var cts = new CancellationTokenSource(); cts.Cancel();
    try { await cache.GetAsync<string>(prefix + "outside", cts.Token); throw new Exception("Cancellation ignored"); }
    catch (OperationCanceledException) { Console.WriteLine("PASS: cancellation"); }
} finally { await cache.RemoveByPrefixAsync(prefix); }

