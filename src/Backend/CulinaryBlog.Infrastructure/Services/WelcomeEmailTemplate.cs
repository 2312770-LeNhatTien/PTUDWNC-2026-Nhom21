namespace CulinaryBlog.Infrastructure.Services;

/// <summary>
/// Mẫu thiết kế Email HTML Chào mừng thành viên mới (phục vụ FR-JOB-001).
/// Được định dạng chuẩn Responsive, màu sắc chủ đạo nhận diện thương hiệu Culinary Blog (#EA580C).
/// </summary>
public static class WelcomeEmailTemplate
{
    /// <summary>
    /// Tiêu đề mặc định cho Email chào mừng thành viên mới
    /// </summary>
    public const string DefaultSubject = "Chào mừng bạn đến với Culinary Blog - Nơi đam mê ẩm thực hội tụ!";

    /// <summary>
    /// Sinh chuỗi mã nguồn HTML hoàn chỉnh cho Email chào mừng.
    /// </summary>
    /// <param name="displayName">Tên hiển thị của người dùng</param>
    /// <param name="exploreUrl">Đường dẫn trang chủ hoặc trang khám phá món ăn (mặc định: http://localhost:3000)</param>
    /// <returns>Chuỗi HTML định dạng sẵn với inline CSS tương thích đa nền tảng email</returns>
    public static string BuildHtml(string displayName, string exploreUrl)
    {
        var safeName = System.Net.WebUtility.HtmlEncode(displayName);
        var safeUrl = System.Net.WebUtility.HtmlEncode(exploreUrl);

        return $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Chào mừng bạn đến với Culinary Blog</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            background-color: #F8FAFC;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #334155;
            -webkit-font-smoothing: antialiased;
        }}
        .container {{
            max-width: 600px;
            margin: 40px auto;
            background-color: #FFFFFF;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #E2E8F0;
        }}
        .header {{
            background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
            padding: 40px 30px;
            text-align: center;
            color: #FFFFFF;
        }}
        .header-icon {{
            font-size: 48px;
            margin-bottom: 12px;
            display: inline-block;
        }}
        .header h1 {{
            margin: 0;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }}
        .header p {{
            margin: 8px 0 0;
            font-size: 15px;
            opacity: 0.95;
        }}
        .content {{
            padding: 36px 32px;
            line-height: 1.65;
            font-size: 15px;
        }}
        .greeting {{
            font-size: 18px;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 16px;
        }}
        .features-card {{
            background-color: #FFF7ED;
            border: 1px solid #FFEDD5;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
        }}
        .feature-item {{
            margin-bottom: 12px;
            display: flex;
            align-items: center;
        }}
        .feature-item:last-child {{
            margin-bottom: 0;
        }}
        .feature-bullet {{
            color: #EA580C;
            font-size: 18px;
            margin-right: 10px;
            line-height: 1;
        }}
        .cta-container {{
            text-align: center;
            margin: 32px 0 24px;
        }}
        .cta-button {{
            display: inline-block;
            background-color: #EA580C;
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 14px 32px;
            font-size: 16px;
            font-weight: 700;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);
        }}
        .signature {{
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #F1F5F9;
            font-size: 14px;
            color: #64748B;
        }}
        .footer {{
            background-color: #F1F5F9;
            padding: 24px 30px;
            text-align: center;
            font-size: 12px;
            color: #94A3B8;
            line-height: 1.5;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <!-- Header với Gradient cam ẩm thực đặc trưng -->
        <div class=""header"">
            <div class=""header-icon"">🍳</div>
            <h1>Culinary Blog</h1>
            <p>Nơi đam mê nấu nướng và sáng tạo ẩm thực hội tụ</p>
        </div>

        <!-- Thân Email -->
        <div class=""content"">
            <div class=""greeting"">Xin chào {safeName}! 👋</div>
            
            <p>Chúc mừng bạn đã chính thức gia nhập đại gia đình <strong>Culinary Blog</strong>. Chúng tôi vô cùng hào hứng khi được đồng hành cùng bạn trên hành trình khám phá và sáng tạo các món ăn hấp dẫn.</p>
            
            <div class=""features-card"">
                <div style=""font-weight: 700; color: #9A3412; margin-bottom: 12px;"">🎉 Những trải nghiệm đang chờ đón bạn:</div>
                <div class=""feature-item"">
                    <span class=""feature-bullet"">✨</span>
                    <span><strong>Sáng tạo công thức:</strong> Viết và chia sẻ các công thức tâm đắc theo từng bước chi tiết kèm nguyên liệu.</span>
                </div>
                <div class=""feature-item"">
                    <span class=""feature-bullet"">📖</span>
                    <span><strong>Bộ sưu tập món ngon:</strong> Khám phá hàng trăm công thức đa dạng từ các đầu bếp tài năng.</span>
                </div>
                <div class=""feature-item"">
                    <span class=""feature-bullet"">💬</span>
                    <span><strong>Kết nối cộng đồng:</strong> Giao lưu, bình luận và đánh giá công thức nấu ăn cùng bạn bè.</span>
                </div>
            </div>

            <!-- Nút Call to Action (CTA) -->
            <div class=""cta-container"">
                <a href=""{safeUrl}"" class=""cta-button"">Khám Phá Công Thức Ngay &rarr;</a>
            </div>

            <p style=""font-size: 13px; color: #64748B; text-align: center;"">Nếu nút trên không mở được, bạn có thể truy cập trực tiếp qua đường dẫn: <a href=""{safeUrl}"" style=""color: #EA580C;"">{safeUrl}</a></p>

            <div class=""signature"">
                Chúc bạn có những phút giây nấu ăn thật tràn đầy cảm hứng và niềm vui!<br><br>
                Trân trọng,<br>
                <strong>Đội ngũ Culinary Blog — Nhóm 21 (PTUDWNC-2026)</strong>
            </div>
        </div>

        <!-- Footer -->
        <div class=""footer"">
            <p style=""margin: 0 0 6px;"">Email này được gửi tự động khi tài khoản của bạn được khởi tạo thành công tại Culinary Blog.</p>
            <p style=""margin: 0;"">&copy; 2026 Culinary Blog. Tất cả các quyền được bảo lưu.</p>
        </div>
    </div>
</body>
</html>";
    }
}
