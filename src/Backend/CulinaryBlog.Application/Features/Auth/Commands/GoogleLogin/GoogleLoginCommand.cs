using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Auth.Commands.GoogleLogin;

/// <summary>
/// CQRS Command đăng nhập bằng Google OAuth 2.0 qua Google ID Token (FR-AUTH-003).
/// </summary>
public sealed record GoogleLoginCommand(
    string IdToken,
    string? ClientIp = null) : IRequest<AuthResponseDto>;
