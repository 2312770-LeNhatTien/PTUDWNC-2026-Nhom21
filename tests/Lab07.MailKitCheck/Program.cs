using CulinaryBlog.Domain.Settings;
using CulinaryBlog.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

Console.WriteLine("==================================================================");
Console.WriteLine("KIỂM THỬ TASK 1 TUẦN 7: MAILKIT EMAIL SERVICE & HTML TEMPLATE");
Console.WriteLine("==================================================================");

// 1. Cấu hình SmtpSettings trỏ vào Docker MailHog
var smtpSettings = Options.Create(new SmtpSettings
{
    Host = "localhost",
    Port = 1025,
    FromEmail = "no-reply@culinaryblog.local",
    FromName = "Culinary Blog"
});

// 2. Tạo Logger
using var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole();
    builder.SetMinimumLevel(LogLevel.Information);
});
var logger = loggerFactory.CreateLogger<MailKitEmailService>();

// 3. Khởi tạo dịch vụ MailKitEmailService
var emailService = new MailKitEmailService(smtpSettings, logger);

// 4. Sinh nội dung HTML chào mừng từ template
var recipientEmail = "duc.lam@culinaryblog.local";
var recipientName = "Lâm Văn Đức";
var htmlBody = WelcomeEmailTemplate.BuildHtml(recipientName, "http://localhost:3000");

Console.WriteLine($"\n[1/2] Đang gửi email chào mừng tới: {recipientName} <{recipientEmail}>...");

try
{
    await emailService.SendAsync(recipientEmail, WelcomeEmailTemplate.DefaultSubject, htmlBody);
    Console.WriteLine("[2/2] Gửi email thành công qua cổng 1025!");
    Console.WriteLine("\n--> Hãy mở trình duyệt và truy cập: http://localhost:8025 để xem hộp thư MailHog.");
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"[LỖI]: Không thể gửi email: {ex.Message}");
    Console.ResetColor();
    Environment.Exit(1);
}
