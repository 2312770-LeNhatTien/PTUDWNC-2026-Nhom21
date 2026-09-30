using MediatR;
using Microsoft.AspNetCore.Identity;
using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;

namespace CulinaryBlog.Application.Features.Auth.Commands.Login;

// FR-AUTH-002 - Đăng nhập bằng Email và Mật khẩu.
public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private const int RefreshTokenExpiryDays = 7;

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly IApplicationDbContext _context;

    public LoginCommandHandler(
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        IApplicationDbContext context)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _context = context;
    }

    public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        // 1. Tìm user theo Email.
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            // Tránh user enumeration: dùng chung thông báo lỗi
            throw new UnauthorizedException("Email hoặc mật khẩu không chính xác.");
        }

        // 2. Kiểm tra tài khoản có bị vô hiệu hóa bởi Admin không (SRS mục 3.1 & Phụ lục B).
        if (!user.IsActive)
        {
            throw new ForbiddenException("Tài khoản đã bị quản trị viên vô hiệu hóa.");
        }

        // 3. Kiểm tra tài khoản có đang bị khóa (Lockout) do nhập sai nhiều lần trước đó không.
        if (await _userManager.IsLockedOutAsync(user))
        {
            throw new LockedException("Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.");
        }

        // 4. Kiểm tra mật khẩu.
        var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid)
        {
            // Tăng số lần thử thất bại (tự động khóa 15 phút nếu đạt 5 lần theo Identity Options)
            await _userManager.AccessFailedAsync(user);

            if (await _userManager.IsLockedOutAsync(user))
            {
                throw new LockedException("Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.");
            }

            throw new UnauthorizedException("Email hoặc mật khẩu không chính xác.");
        }

        // 5. Đăng nhập thành công: reset số lần thử sai
        await _userManager.ResetAccessFailedCountAsync(user);

        // 6. Cấp cặp Access Token và Refresh Token
        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _jwtService.GenerateAccessToken(user, roles);
        var (rawRefreshToken, refreshTokenHash) = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = Domain.Entities.RefreshToken.Create(
            userId: user.Id,
            tokenHash: refreshTokenHash,
            expiryDays: RefreshTokenExpiryDays,
            createdByIp: request.ClientIp);

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto(
            AccessToken: accessToken,
            RefreshToken: rawRefreshToken,
            User: new UserProfileDto(
                Id: user.Id,
                Email: user.Email!,
                DisplayName: user.DisplayName,
                AvatarUrl: user.AvatarUrl,
                Roles: roles.ToList()));
    }
}
