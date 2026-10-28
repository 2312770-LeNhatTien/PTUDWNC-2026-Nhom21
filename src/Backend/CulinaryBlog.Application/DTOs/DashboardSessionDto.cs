namespace CulinaryBlog.Application.DTOs;

// Kết quả nội bộ để API tạo cookie; không trả refresh hash trong response body.
public record DashboardSessionDto(string UserId, string DisplayName, string RefreshHash, DateTimeOffset ExpiresAt);
