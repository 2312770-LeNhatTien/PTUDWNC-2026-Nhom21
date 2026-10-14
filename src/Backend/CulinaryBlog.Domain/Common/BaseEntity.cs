namespace CulinaryBlog.Domain.Common;

// SRS mục 7.1 - Tất cả thực thể kế thừa BaseEntity.
// CreatedAt khởi tạo UTC; domain Touch() cập nhật UpdatedAt.
// IsDeleted: soft delete flag, có Global Query Filter .Where(x => !x.IsDeleted).
// RowVersion: optimistic concurrency token.
public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; protected set; }
    public byte[]? RowVersion { get; protected set; }

    public void MarkDeleted()
    {
        IsDeleted = true;
        Touch();
    }
    protected void Touch() => UpdatedAt = DateTime.UtcNow;
}
