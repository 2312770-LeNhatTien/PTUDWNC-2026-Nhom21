namespace CulinaryBlog.Domain.Entities;

// Phiên bản cache public lưu cùng DB để không mất invalidation khi Redis ngắt kết nối.
public sealed class CacheVersion
{
    public int Id { get; private set; } = 1;
    public string Revision { get; private set; } = "initial";
    public void Advance() => Revision = Guid.NewGuid().ToString("N");
}
