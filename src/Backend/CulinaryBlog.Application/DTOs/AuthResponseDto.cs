namespace CulinaryBlog.Application.DTOs;

// FR-AUTH-001/002/003/006/007 - trả về cho client sau khi đăng ký/đăng nhập và xem/cập nhật hồ sơ.
// RefreshToken ở đây là RAW token (chưa hash) - chỉ trả 1 lần duy nhất cho client,
// server chỉ lưu TokenHash (xem RefreshToken.cs, SRS mục 7.8).
public record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    UserProfileDto User
);

// DTO chứa thông tin an toàn của người dùng (NFR-SEC: tuyệt đối không chứa PasswordHash)
public record UserProfileDto(
    string Id,
    string Email,
    string DisplayName,
    string? AvatarUrl,
    IReadOnlyList<string> Roles,
    string? Bio = null
);