using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Auth.Commands.RefreshToken;

/// <summary>
/// Command làm mới cặp Access Token và Refresh Token theo cơ chế Rotation (FR-AUTH-004).
/// </summary>
public sealed record RefreshTokenCommand(
    string RefreshToken,
    string? ClientIp = null) : IRequest<AuthResponseDto>;
