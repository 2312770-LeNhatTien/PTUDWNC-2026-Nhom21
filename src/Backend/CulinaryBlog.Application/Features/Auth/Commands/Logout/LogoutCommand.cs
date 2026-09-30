using MediatR;

namespace CulinaryBlog.Application.Features.Auth.Commands.Logout;

/// <summary>
/// CQRS Command thực hiện thu hồi phiên làm việc (Refresh Token) khi đăng xuất (FR-AUTH-005).
/// </summary>
public sealed record LogoutCommand(string RefreshToken) : IRequest;
