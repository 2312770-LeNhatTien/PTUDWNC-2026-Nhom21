using CulinaryBlog.Application.Common.Interfaces;

namespace CulinaryBlog.Infrastructure.Caching;

/// <summary>
/// Cache phân tán qua Redis sử dụng IDistributedCache.
/// Phụ trách: Nguyễn Viết Toàn (MSSV: 2312777) - Kỹ thuật Caching & NFR-PERF-003.
/// 
/// Nhiệm vụ thành viên:
/// 1. GetAsync: Lấy byte[] từ _cache.GetAsync(key), deserialize JSON UTF-8 về kiểu T.
/// 2. SetAsync: Serialize value T sang byte[], lưu vào Redis qua _cache.SetAsync kèm thời hạn TTL (DistributedCacheEntryOptions).
/// 3. RemoveAsync: Xóa key khỏi Redis qua _cache.RemoveAsync.
/// 4. RemoveByPrefixAsync: Quản lý danh sách key theo tiền tố (ví dụ "categories:") để xóa hàng loạt khi dữ liệu thay đổi (Cache Invalidation).
/// </summary>
public class RedisCacheService : ICacheService
{
    public RedisCacheService()
    {
    }

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        throw new NotImplementedException("RedisCacheService.GetAsync chưa được hiện thực. Nguyễn Viết Toàn sẽ hiện thực phương thức này.");
    }

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        throw new NotImplementedException("RedisCacheService.SetAsync chưa được hiện thực. Nguyễn Viết Toàn sẽ hiện thực phương thức này.");
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    {
        throw new NotImplementedException("RedisCacheService.RemoveAsync chưa được hiện thực. Nguyễn Viết Toàn sẽ hiện thực phương thức này.");
    }

    public Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        throw new NotImplementedException("RedisCacheService.RemoveByPrefixAsync chưa được hiện thực. Nguyễn Viết Toàn sẽ hiện thực phương thức này.");
    }
}
