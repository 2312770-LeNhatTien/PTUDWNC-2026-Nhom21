namespace CulinaryBlog.Domain.Settings;

/// <summary>
/// Cấu hình máy chủ SMTP gửi email (phục vụ FR-JOB-001).
/// Được nạp từ section "Smtp" trong appsettings.json.
/// Môi trường Dev kết nối đến container Docker Mailhog (localhost:1025).
/// </summary>
public class SmtpSettings
{
    public const string SectionName = "Smtp";

    /// <summary>
    /// Địa chỉ máy chủ SMTP (mặc định: localhost)
    /// </summary>
    public string Host { get; init; } = "localhost";

    /// <summary>
    /// Cổng kết nối SMTP (Mailhog dev: 1025, SMTP chuẩn: 587/465)
    /// </summary>
    public int Port { get; init; } = 1025;

    /// <summary>
    /// Địa chỉ email người gửi đại diện cho hệ thống
    /// </summary>
    public string FromEmail { get; init; } = "no-reply@culinaryblog.local";

    /// <summary>
    /// Tên hiển thị của người gửi (Culinary Blog)
    /// </summary>
    public string FromName { get; init; } = "Culinary Blog";
}
