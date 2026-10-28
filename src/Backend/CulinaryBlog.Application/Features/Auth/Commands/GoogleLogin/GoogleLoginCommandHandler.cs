using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Settings;
using Google.Apis.Auth;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace CulinaryBlog.Application.Features.Auth.Commands.GoogleLogin;

/// <summary>
/// Handler xử lý đăng nhập Google OAuth 2.0 (FR-AUTH-003 / Khắc phục bảo mật R06).
/// Quy tắc bảo mật:
/// 1. Xác thực Google ID Token với Audience bắt buộc phải trùng khớp Google Client ID của ứng dụng (chống Token Substitution Attack).
/// 2. Bắt buộc kiểm tra cờ EmailVerified = true từ Google để chống giả mạo email.
/// 3. Quản lý liên kết tài khoản qua cặp Provider ("Google") và ProviderKey (payload.Subject / sub) trên AspNetUserLogins:
///    - Nếu đã liên kết trước đó: Đăng nhập trực tiếp.
///    - Nếu trùng email tài khoản Local: Chỉ liên kết khi tài khoản đã xác thực email (EmailConfirmed = true).
///    - Nếu tài khoản mới: Tự động khởi tạo ApplicationUser và lưu bản ghi liên kết vào AspNetUserLogins.
/// 4. Cấp cặp Access Token (JWT 15 phút) và Refresh Token (7 ngày lưu CSDL).
/// </summary>
public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, AuthResponseDto>
{
    private const int RefreshTokenExpiryDays = 7;

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly IApplicationDbContext _context;
    private readonly GoogleAuthSettings _googleSettings;

    public GoogleLoginCommandHandler(
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        IApplicationDbContext context,
        IOptions<GoogleAuthSettings> googleOptions)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _context = context;
        _googleSettings = googleOptions.Value;
    }

    public async Task<AuthResponseDto> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra cấu hình Google Client ID trên máy chủ (R06)
        var expectedClientId = _googleSettings.ClientId;
        if (string.IsNullOrWhiteSpace(expectedClientId))
        {
            throw new InvalidOperationException("Máy chủ chưa được cấu hình Google Client ID (Authentication:Google:ClientId).");
        }

        // 2. Xác thực Google ID Token với Audience bắt buộc và chữ ký từ máy chủ Google (R06)
        var validationSettings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { expectedClientId }
        };

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, validationSettings);
        }
        catch (InvalidJwtException ex)
        {
            throw new ValidationException("IdToken", $"Token Google không hợp lệ hoặc không thuộc ứng dụng này: {ex.Message}");
        }
        catch (Exception)
        {
            throw new ValidationException("IdToken", "Token Google không hợp lệ hoặc đã hết hạn.");
        }

        // 3. Kiểm tra thông tin định danh tối thiểu trong payload
        if (string.IsNullOrWhiteSpace(payload.Subject))
        {
            throw new ValidationException("IdToken", "Không thể lấy thông tin định danh người dùng (sub) từ tài khoản Google.");
        }

        if (string.IsNullOrWhiteSpace(payload.Email))
        {
            throw new ValidationException("IdToken", "Không thể lấy thông tin email từ tài khoản Google.");
        }

        // Bắt buộc email từ Google phải đã được xác thực (R06)
        if (!payload.EmailVerified)
        {
            throw new ValidationException("IdToken", "Email tài khoản Google chưa được xác thực (EmailVerified = false).");
        }

        // 4. Liên kết tài khoản an toàn qua Provider ("Google") và ProviderKey (payload.Subject)
        var user = await _userManager.FindByLoginAsync("Google", payload.Subject);
        if (user is null)
        {
            // Kiểm tra xem đã có tài khoản theo email hay chưa
            user = await _userManager.FindByEmailAsync(payload.Email);
            if (user is not null)
            {
                // Tài khoản đã tồn tại từ trước (tạo từ email/password)
                // Theo R06: Chỉ liên kết nếu email tài khoản local đã được xác minh để tránh chiếm đoạt tài khoản
                if (!user.EmailConfirmed)
                {
                    throw new ValidationException("General",
                        "Tài khoản với email này đã tồn tại nhưng chưa được xác nhận email. Vui lòng xác thực email trước khi liên kết Google.");
                }

                // Thực hiện liên kết thông tin đăng nhập Google vào tài khoản hiện có
                var addLoginResult = await _userManager.AddLoginAsync(user, new UserLoginInfo("Google", payload.Subject, "Google"));
                if (!addLoginResult.Succeeded)
                {
                    var errors = string.Join("; ", addLoginResult.Errors.Select(e => e.Description));
                    throw new ValidationException("General", $"Không thể liên kết tài khoản Google: {errors}");
                }
            }
            else
            {
                // Tự động tạo tài khoản mới cho người dùng Google lần đầu
                var displayName = !string.IsNullOrWhiteSpace(payload.Name)
                    ? payload.Name.Trim()
                    : payload.Email.Split('@')[0];

                user = ApplicationUser.CreateFromGoogle(
                    email: payload.Email,
                    displayName: displayName,
                    avatarUrl: payload.Picture);

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
                    throw new ValidationException("General", $"Không thể khởi tạo tài khoản từ Google: {errors}");
                }

                // Gán vai trò mặc định Author cho thành viên mới
                await _userManager.AddToRoleAsync(user, "Author");

                // Lưu liên kết Google Login vào bảng AspNetUserLogins
                var addLoginResult = await _userManager.AddLoginAsync(user, new UserLoginInfo("Google", payload.Subject, "Google"));
                if (!addLoginResult.Succeeded)
                {
                    var errors = string.Join("; ", addLoginResult.Errors.Select(e => e.Description));
                    throw new ValidationException("General", $"Không thể lưu liên kết tài khoản Google: {errors}");
                }
            }
        }
        else
        {
            // Người dùng đã từng đăng nhập Google trước đó -> cập nhật avatar nếu chưa có
            if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(payload.Picture))
            {
                user.AvatarUrl = payload.Picture;
                await _userManager.UpdateAsync(user);
            }
        }

        // 5. Kiểm tra tài khoản có bị vô hiệu hóa bởi Admin không
        if (!user.IsActive)
        {
            throw new ForbiddenException("Tài khoản đã bị quản trị viên vô hiệu hóa.");
        }

        // 6. Lấy danh sách Roles
        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Count == 0)
        {
            await _userManager.AddToRoleAsync(user, "Author");
            roles = new List<string> { "Author" };
        }

        // 7. Cấp cặp Access Token và Refresh Token mới
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
