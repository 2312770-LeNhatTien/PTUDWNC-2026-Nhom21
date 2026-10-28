using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Auth.Commands.CreateDashboardSession;

public record CreateDashboardSessionCommand(string RefreshToken, long AccessTokenExpiresAt) : IRequest<DashboardSessionDto>;

public class CreateDashboardSessionCommandHandler(IApplicationDbContext context, IJwtService jwt,
    UserManager<ApplicationUser> manager, ICurrentUser currentUser)
    : IRequestHandler<CreateDashboardSessionCommand, DashboardSessionDto>
{
    public async Task<DashboardSessionDto> Handle(CreateDashboardSessionCommand request, CancellationToken cancellationToken)
    {
        if (!currentUser.IsAuthenticated || currentUser.UserId is not { } id)
            throw new UnauthorizedException("Vui lòng đăng nhập.");
        // Đọc lại trạng thái/quyền trong DB thay vì chỉ tin role từ JWT cũ.
        var user = await manager.FindByIdAsync(id);
        if (user?.IsActive != true || !await manager.IsInRoleAsync(user, "Admin"))
            throw new ForbiddenException("Chỉ Admin đang hoạt động được mở dashboard.");
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new ValidationException("DASHBOARD_SESSION_INVALID", "Không thể tạo phiên dashboard.");
        var hash = jwt.HashRefreshToken(request.RefreshToken);
        var now = DateTimeOffset.UtcNow;
        if (!await context.RefreshTokens.AnyAsync(t => t.UserId == id && t.TokenHash == hash &&
                t.RevokedAt == null && t.ExpiresAt > now.UtcDateTime, cancellationToken))
            throw new UnauthorizedException("Phiên đăng nhập đã hết hạn hoặc bị thu hồi.");
        var expires = DateTimeOffset.FromUnixTimeSeconds(request.AccessTokenExpiresAt);
        if (expires <= now) throw new UnauthorizedException("Access token đã hết hạn.");
        if (expires > now.AddMinutes(15)) expires = now.AddMinutes(15);
        return new DashboardSessionDto(id, user.DisplayName, hash, expires);
    }
}
