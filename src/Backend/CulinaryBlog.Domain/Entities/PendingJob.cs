namespace CulinaryBlog.Domain.Entities;

// Lưu ý định chạy nền cùng giao dịch dữ liệu; queue tạm lỗi không làm mất công việc.
public class PendingJob
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Kind { get; private set; } = string.Empty;
    public Guid? ResourceId { get; private set; }
    public string? UserId { get; private set; }
    public string? FileUrl { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public string? HangfireJobId { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    private PendingJob() { }
    public static PendingJob Welcome(string userId) => new() { Kind = "welcome", UserId = userId };
    public static PendingJob Resize(Guid imageId) => new() { Kind = "resize", ResourceId = imageId };
    public static PendingJob DeleteImage(Guid imageId) => new() { Kind = "delete-image", ResourceId = imageId };
    public static PendingJob DeleteFile(string url) => new() { Kind = "delete-file", FileUrl = url };
    public void Scheduled(string jobId) => HangfireJobId = jobId;
    public void Complete() => CompletedAt = DateTime.UtcNow;
}
