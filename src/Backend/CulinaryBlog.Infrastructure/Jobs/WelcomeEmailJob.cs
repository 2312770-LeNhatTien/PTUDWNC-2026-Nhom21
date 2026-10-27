using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Infrastructure.Services;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Infrastructure.Jobs;

/// <summary>
/// Hiện thực hóa tác vụ nền Hangfire gửi email chào mừng thành viên mới (phục vụ FR-JOB-001).
/// Tuân thủ quy định Retry Policy của SRS mục 3.6:
/// - Thử lại tối đa 3 lần.
/// - Khoảng thời gian dãn cách lũy thừa (Exponential Backoff): 1 phút (60s), 5 phút (300s), 30 phút (1800s).
/// </summary>
public class WelcomeEmailJob : IWelcomeEmailJob
{
    private readonly IEmailService _emailService;
    private readonly ILogger<WelcomeEmailJob> _logger;

    public WelcomeEmailJob(
        IEmailService emailService,
        ILogger<WelcomeEmailJob> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    /// <summary>
    /// Thực thi gửi email chào mừng với nội dung HTML từ WelcomeEmailTemplate.
    /// Nếu xảy ra lỗi mạng hoặc gián đoạn kết nối SMTP, Hangfire tự động retry theo DelaysInSeconds.
    /// </summary>
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 1800 }, LogEvents = true)]
    public async Task ExecuteAsync(string email, string displayName, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "[Hangfire FR-JOB-001] Bắt đầu thực thi gửi email chào mừng cho thành viên '{DisplayName}' <{Email}>...",
            displayName, email);

        // 1. Sinh nội dung HTML từ template chuẩn nhận diện Culinary Blog
        var htmlBody = WelcomeEmailTemplate.BuildHtml(displayName, "http://localhost:3000");

        // 2. Gửi qua MailKitEmailService (SMTP cổng 1025 MailHog dev)
        await _emailService.SendAsync(email, WelcomeEmailTemplate.DefaultSubject, htmlBody, ct);

        _logger.LogInformation(
            "[Hangfire FR-JOB-001] Đã hoàn tất gửi email chào mừng cho thành viên '{DisplayName}' <{Email}> thành công.",
            displayName, email);
    }
}
