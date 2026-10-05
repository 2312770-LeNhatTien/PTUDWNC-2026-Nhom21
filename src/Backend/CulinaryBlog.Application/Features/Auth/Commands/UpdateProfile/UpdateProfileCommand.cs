// ============================================================================
// CHỨC NĂNG: FR-AUTH-007 - Cập nhật hồ sơ cá nhân & ảnh đại diện
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// HỖ TRỢ CẬP NHẬT: DisplayName, Bio, AvatarUrl (liên kết với MinIO)
// VALIDATION: DisplayName <= 50 ký tự, Bio <= 500 ký tự
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace CulinaryBlog.Application.Features.Auth.Commands.UpdateProfile;

/// <summary>
/// Command cập nhật thông tin hồ sơ của người dùng hiện tại.
/// UserId được giải mã tự động từ Token đăng nhập qua ICurrentUser.
/// </summary>
public record UpdateProfileCommand(
    string? DisplayName = null,
    string? Bio = null,
    string? AvatarUrl = null
) : IRequest<UserProfileDto>;

/// <summary>
/// Validator kiểm tra ràng buộc độ dài và tính hợp lệ của thông tin cập nhật hồ sơ.
/// </summary>
public class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        // 1. Kiểm tra Tên hiển thị (DisplayName) nếu có cập nhật: không vượt quá 50 ký tự
        When(x => x.DisplayName != null, () =>
        {
            RuleFor(x => x.DisplayName)
                .NotEmpty().WithMessage("Tên hiển thị không được để trống khi cập nhật.")
                .MaximumLength(50).WithMessage("Tên hiển thị không được vượt quá 50 ký tự.");
        });

        // 2. Kiểm tra Tiểu sử (Bio) nếu có cập nhật: không vượt quá 500 ký tự
        When(x => x.Bio != null, () =>
        {
            RuleFor(x => x.Bio)
                .MaximumLength(500).WithMessage("Tiểu sử cá nhân không được vượt quá 500 ký tự.");
        });

        // 3. Kiểm tra URL ảnh đại diện nếu có cập nhật: giới hạn tối đa 1000 ký tự
        When(x => !string.IsNullOrWhiteSpace(x.AvatarUrl), () =>
        {
            RuleFor(x => x.AvatarUrl)
                .MaximumLength(1000).WithMessage("Đường dẫn ảnh đại diện không được vượt quá 1000 ký tự.");
        });
    }
}

/// <summary>
/// Handler xử lý cập nhật hồ sơ cá nhân và lưu thông tin mới vào CSDL.
/// </summary>
public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, UserProfileDto>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ICurrentUser _currentUser;

    public UpdateProfileCommandHandler(
        UserManager<ApplicationUser> userManager,
        ICurrentUser currentUser)
    {
        _userManager = userManager;
        _currentUser = currentUser;
    }

    public async Task<UserProfileDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra trạng thái xác thực từ Token
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
        }

        // 2. Lấy người dùng hiện tại từ CSDL
        var userId = _currentUser.UserId;
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            throw new NotFoundException("Người dùng", userId);
        }

        // 3. Kiểm tra tài khoản có bị vô hiệu hóa không
        if (!user.IsActive)
        {
            throw new ForbiddenException("Tài khoản của bạn đã bị quản trị viên vô hiệu hóa.");
        }

        // 4. Áp dụng các thay đổi hồ sơ vào Entity
        user.UpdateProfile(request.DisplayName, request.AvatarUrl, request.Bio);

        // 5. Cập nhật vào cơ sở dữ liệu thông qua UserManager
        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            var errors = updateResult.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

            throw new CulinaryBlog.Application.Common.Exceptions.ValidationException(errors);
        }

        // 6. Lấy danh sách vai trò hiện tại
        var roles = await _userManager.GetRolesAsync(user);

        // 7. Trả về thông tin hồ sơ mới cập nhật (bảo mật, không kèm PasswordHash)
        return new UserProfileDto(
            Id: user.Id,
            Email: user.Email ?? string.Empty,
            DisplayName: user.DisplayName,
            AvatarUrl: user.AvatarUrl,
            Roles: roles.ToList(),
            Bio: user.Bio
        );
    }
}