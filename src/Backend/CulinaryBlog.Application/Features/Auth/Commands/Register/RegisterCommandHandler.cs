using MediatR;
using Microsoft.AspNetCore.Identity;
using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;

namespace CulinaryBlog.Application.Features.Auth.Commands.Register;

// FR-AUTH-001 - Đăng ký tài khoản mới.
public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponseDto>
{
    // TODO: chưa xác nhận được JwtSettings:RefreshTokenExpiryDays trong appsettings.
    // Tạm để 7 ngày - đổi thành lấy từ IConfiguration/IOptions<JwtSettings> khi có file config thật.
    private const int RefreshTokenExpiryDays = 7;

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly IApplicationDbContext _context;

    public RegisterCommandHandler(
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        IApplicationDbContext context)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _context = context;
    }

    public async Task<AuthResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            throw new ConflictException("Email đã được sử dụng.");
        }

        var user = ApplicationUser.Create(request.Email, request.DisplayName, request.UserName);

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

            throw new ValidationException(errors);
        }

        await _userManager.AddToRoleAsync(user, "Author");
        var roles = await _userManager.GetRolesAsync(user);

        var accessToken = _jwtService.GenerateAccessToken(user, roles);
        var (rawRefreshToken, refreshTokenHash) = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = Domain.Entities.RefreshToken.Create(
            userId: user.Id,
            tokenHash: refreshTokenHash,
            expiryDays: RefreshTokenExpiryDays);

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
