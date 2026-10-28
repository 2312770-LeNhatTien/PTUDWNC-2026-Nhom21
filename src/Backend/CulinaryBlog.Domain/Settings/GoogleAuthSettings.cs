namespace CulinaryBlog.Domain.Settings;

/// <summary>
/// Cấu hình xác thực cho Google OAuth 2.0 (FR-AUTH-003 / R06).
/// Ánh xạ từ mục "Authentication:Google" trong appsettings.json.
/// </summary>
public class GoogleAuthSettings
{
    public const string SectionName = "Authentication:Google";

    /// <summary>
    /// Google Client ID được cấp từ Google Cloud Console.
    /// Dùng để xác thực trường Audience (aud) trong Google ID Token,
    /// ngăn chặn các cuộc tấn công thay thế token (Token Substitution Attack).
    /// </summary>
    public string ClientId { get; set; } = string.Empty;
}
