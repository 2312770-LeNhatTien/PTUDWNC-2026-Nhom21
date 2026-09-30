using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Auth.Commands.RefreshToken;

/// <summary>
/// Handler xử lý làm mới Access Token áp dụng kỹ thuật:
/// 1. Rotation (Xoay vòng): Mỗi refresh token chỉ dùng 1 lần, cấp cặp token mới và thu hồi token cũ.
/// 2. Reuse Detection (Phát hiện tấn công): Nếu token đã bị thu hồi mà lại được dùng ➔ Hủy toàn bộ token family của user đó.
/// </summary>
public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    private const int RefreshTokenExpiryDays = 7;

    private readonly IJwtService _jwtService;
    private readonly IApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public RefreshTokenCommandHandler(
        IJwtService jwtService,
        IApplicationDbContext context,
        UserManager<ApplicationUser> userManager)
    {
        _jwtService = jwtService;
        _context = context;
        _userManager = userManager;
    }

    public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        // 1. Băm SHA-256 raw token nhận từ Client (SRS mục 7.8)
        var tokenHash = _jwtService.HashRefreshToken(request.RefreshToken);

        // 2. Tìm entity RefreshToken trong CSDL kèm thông tin User
        var token = await _context.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (token is null)
        {
            throw new UnauthorizedException("Token không hợp lệ.");
        }

        // 3. Kỹ thuật REUSE DETECTION (Phát hiện tấn công tái sử dụng token cũ)
        // Nếu token đã có RevokedAt != null mà vẫn gửi lên ➔ Token đã bị kẻ xấu đánh cắp
        if (token.IsRevoked)
        {
            // Thu hồi toàn bộ các Refresh Token còn hoạt động của User đó
            var activeTokens = await _context.RefreshTokens
                .Where(x => x.UserId == token.UserId && x.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var activeToken in activeTokens)
            {
                activeToken.Revoke();
            }

            await _context.SaveChangesAsync(cancellationToken);

            throw new UnauthorizedException("Token đã bị thu hồi trước đó. Phát hiện hành vi bất thường, tất cả phiên làm việc đã bị hủy. Vui lòng đăng nhập lại.");
        }

        // 4. Kiểm tra token hết hạn
        if (token.IsExpired)
        {
            throw new UnauthorizedException("Token đã hết hạn. Vui lòng đăng nhập lại.");
        }

        // 5. Kiểm tra trạng thái tài khoản người dùng
        var user = token.User ?? await _userManager.FindByIdAsync(token.UserId);
        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedException("Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.");
        }

        // 6. Kỹ thuật REFRESH TOKEN ROTATION (Cấp mới và thay thế)
        var (newRawRefreshToken, newTokenHash) = _jwtService.GenerateRefreshToken();

        // Thu hồi token cũ và ghi vết token mới thay thế
        token.Revoke(newTokenHash);

        // Lấy danh sách Roles hiện tại của user để sinh Access Token mới
        var roles = await _userManager.GetRolesAsync(user);
        var newAccessToken = _jwtService.GenerateAccessToken(user, roles);

        // Lưu Refresh Token mới vào CSDL
        var newRefreshTokenEntity = Domain.Entities.RefreshToken.Create(
            userId: user.Id,
            tokenHash: newTokenHash,
            expiryDays: RefreshTokenExpiryDays,
            createdByIp: request.ClientIp);

        _context.RefreshTokens.Add(newRefreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto(
            AccessToken: newAccessToken,
            RefreshToken: newRawRefreshToken,
            User: new UserProfileDto(
                Id: user.Id,
                Email: user.Email!,
                DisplayName: user.DisplayName,
                AvatarUrl: user.AvatarUrl,
                Roles: roles.ToList()));
    }
}
