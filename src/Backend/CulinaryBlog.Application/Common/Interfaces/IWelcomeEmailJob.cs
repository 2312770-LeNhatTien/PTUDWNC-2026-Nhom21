namespace CulinaryBlog.Application.Common.Interfaces;

/// <summary>
/// Giao diện định nghĩa tác vụ nền gửi email chào mừng thành viên mới (phục vụ FR-JOB-001).
/// Được kích hoạt bất đồng bộ qua Hangfire theo cơ chế Fire-and-forget.
/// </summary>
public interface IWelcomeEmailJob
{
    /// <summary>
    /// Thực thi tác vụ gửi email chào mừng đến địa chỉ người nhận.
    /// </summary>
    /// <param name="email">Địa chỉ email người nhận</param>
    /// <param name="displayName">Tên hiển thị của người dùng</param>
    /// <param name="ct">Mã hủy yêu cầu CancellationToken</param>
    Task ExecuteAsync(string email, string displayName, CancellationToken ct = default);
}
