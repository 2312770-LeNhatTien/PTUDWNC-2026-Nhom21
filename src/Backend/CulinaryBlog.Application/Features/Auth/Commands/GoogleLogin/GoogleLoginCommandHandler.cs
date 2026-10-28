using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace CulinaryBlog.Application.Features.Auth.Commands.GoogleLogin;

/// <summary>
/// Handler xử lý đăng nhập Google OAuth 2.0 (FR-AUTH-003).
/// Quy tắc:
/// 1. Xác thực Google ID Token qua IGoogleTokenValidator, SDK nằm ở Infrastructure.
/// 2. Nếu email chưa có ➔ Tự động tạo tài khoản mới với vai trò Author và EmailConfirmed = true.
/// 3. Nếu đã có ➔ Kiểm tra tài khoản không bị vô hiệu hóa (IsActive).
/// 4. Cấp cặp Access Token (JWT 15 phút) và Refresh Token (7 ngày lưu CSDL).
/// </summary>
public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, AuthResponseDto>
{
    private const int RefreshTokenExpiryDays = 7;

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly IApplicationDbContext _context;
    private readonly IGoogleTokenValidator _google;

    public GoogleLoginCommandHandler(
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        IApplicationDbContext context, IGoogleTokenValidator google)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _context = context;
        _google = google;
    }

    public async Task<AuthResponseDto> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
    {
        // 1. Xác thực Google ID Token trực tiếp từ public keys của Google
        var payload = await _google.ValidateAsync(request.IdToken, cancellationToken);

        if (string.IsNullOrWhiteSpace(payload.Email))
        {
            throw new ValidationException("IdToken", "Không thể lấy thông tin email từ tài khoản Google.");
        }

        // 2. Tìm người dùng theo Email
        // Google sub ổn định; không tự ghép vào tài khoản local chỉ vì email trùng.
        var user = await _userManager.FindByLoginAsync("Google", payload.Subject);
        if (user is null)
        {
            if (await _userManager.FindByEmailAsync(payload.Email) is not null)
                throw new ConflictException("Email đã có tài khoản. Vui lòng dùng cách đăng nhập đã đăng ký.", "GOOGLE_ACCOUNT_LINK_REQUIRED");
            // Tự động tạo tài khoản mới cho người dùng Google lần đầu
            var displayName = !string.IsNullOrWhiteSpace(payload.Name)
                ? payload.Name.Trim()
                : payload.Email.Split('@')[0];

            user = ApplicationUser.CreateFromGoogle(
                email: payload.Email,
                displayName: displayName,
                avatarUrl: payload.Picture);

            _context.PendingJobs.Add(PendingJob.Welcome(user.Id));

            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
                throw new ValidationException("General", $"Không thể khởi tạo tài khoản từ Google: {errors}");
            }

            await _userManager.AddToRoleAsync(user, "Author");
            var linked = await _userManager.AddLoginAsync(user, new UserLoginInfo("Google", payload.Subject, "Google"));
            if (!linked.Succeeded) throw new ConflictException("Không thể liên kết tài khoản Google.", "GOOGLE_LINK_FAILED");
        }
        else
        {
            // Cập nhật ảnh đại diện nếu user chưa có avatar
            if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(payload.Picture))
            {
                user.AvatarUrl = payload.Picture;
                await _userManager.UpdateAsync(user);
            }
        }

        // 3. Kiểm tra tài khoản có bị vô hiệu hóa bởi Admin không
        if (!user.IsActive)
        {
            throw new ForbiddenException("Tài khoản đã bị quản trị viên vô hiệu hóa.");
        }

        // 4. Lấy danh sách Roles
        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Count == 0)
        {
            await _userManager.AddToRoleAsync(user, "Author");
            roles = new List<string> { "Author" };
        }

        // 5. Cấp cặp Access Token và Refresh Token mới
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
