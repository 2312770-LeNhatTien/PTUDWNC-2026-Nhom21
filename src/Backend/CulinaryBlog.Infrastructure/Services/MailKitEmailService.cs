using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Settings;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace CulinaryBlog.Infrastructure.Services;

/// <summary>
/// Dịch vụ gửi Email qua giao thức SMTP sử dụng thư viện MailKit (phục vụ FR-JOB-001).
/// Ở môi trường phát triển (Development), dịch vụ kết nối trực tiếp đến container Docker Mailhog (cổng 1025),
/// cho phép lập trình viên kiểm tra nội dung và giao diện email tức thì tại http://localhost:8025.
/// </summary>
public class MailKitEmailService : IEmailService
{
    private readonly SmtpSettings _smtpSettings;
    private readonly ILogger<MailKitEmailService> _logger;

    public MailKitEmailService(
        IOptions<SmtpSettings> smtpSettings,
        ILogger<MailKitEmailService> logger)
    {
        _smtpSettings = smtpSettings.Value;
        _logger = logger;
    }

    /// <summary>
    /// Gửi email dạng HTML bất đồng bộ thông qua MailKit SmtpClient.
    /// </summary>
    /// <param name="to">Địa chỉ email người nhận</param>
    /// <param name="subject">Tiêu đề email</param>
    /// <param name="htmlBody">Nội dung email định dạng HTML</param>
    /// <param name="ct">Mã hủy yêu cầu CancellationToken</param>
    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(to);
        ArgumentException.ThrowIfNullOrWhiteSpace(subject);

        var message = new MimeMessage();

        // 1. Cấu hình người gửi đại diện cho hệ thống Culinary Blog
        message.From.Add(new MailboxAddress(_smtpSettings.FromName, _smtpSettings.FromEmail));

        // 2. Cấu hình người nhận
        message.To.Add(MailboxAddress.Parse(to));

        // 3. Tiêu đề email
        message.Subject = subject;

        // 4. Xây dựng nội dung HTML cho email
        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = htmlBody
        };
        message.Body = bodyBuilder.ToMessageBody();

        // 5. Xác định chế độ bảo mật kết nối theo cổng SMTP
        var socketOptions = _smtpSettings.Port switch
        {
            465 => SecureSocketOptions.SslOnConnect,
            587 => SecureSocketOptions.StartTls,
            _ => SecureSocketOptions.None // Mặc định cho container Docker Mailhog (cổng 1025)
        };

        using var client = new SmtpClient();
        try
        {
            _logger.LogInformation(
                "Đang kết nối tới máy chủ SMTP {Host}:{Port} để gửi email '{Subject}' tới {Recipient}...",
                _smtpSettings.Host, _smtpSettings.Port, subject, to);

            // Kết nối đến SMTP Server
            await client.ConnectAsync(_smtpSettings.Host, _smtpSettings.Port, socketOptions, ct);

            // Gửi email
            await client.SendAsync(message, ct);

            _logger.LogInformation("Đã gửi thành công email '{Subject}' tới {Recipient}.", subject, to);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Không gửi được email qua SMTP {_smtpSettings.Host}:{_smtpSettings.Port}.", ex);
        }
        finally
        {
            // Ngắt kết nối một cách an toàn và giải phóng tài nguyên
            if (client.IsConnected)
            {
                await client.DisconnectAsync(true, ct);
            }
        }
    }
}
