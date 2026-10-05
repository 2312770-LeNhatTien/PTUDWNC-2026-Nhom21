// ============================================================================
// CHỨC NĂNG: FR-AUTH-006 - Xem thông tin hồ sơ cá nhân
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// BẢO MẬT (NFR-SEC): Tuyệt đối không trả về chuỗi băm mật khẩu PasswordHash
// LẤY USERID TỪ JWT CLAIM 'sub' QUA ICurrentUser, CHỐNG LỘ THÔNG TIN RIÊNG TƯ
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace CulinaryBlog.Application.Features.Auth.Queries.GetProfile;

/// <summary>
/// Query yêu cầu lấy thông tin hồ sơ của người dùng hiện tại đang gửi request.
/// Không truyền userId từ client để chống lộ thông tin hoặc giả mạo người khác.
/// </summary>
public record GetProfileQuery() : IRequest<UserProfileDto>;

/// <summary>
/// Handler xử lý nghiệp vụ lấy thông tin hồ sơ cá nhân bảo mật.
/// </summary>
public class GetProfileQueryHandler : IRequestHandler<GetProfileQuery, UserProfileDto>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ICurrentUser _currentUser;

    public GetProfileQueryHandler(
        UserManager<ApplicationUser> userManager,
        ICurrentUser currentUser)
    {
        _userManager = userManager;
        _currentUser = currentUser;
    }

    public async Task<UserProfileDto> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra trạng thái xác thực từ Token của request
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
        }

        // 2. Lấy UserId trực tiếp từ Token đã xác thực (JWT Claim sub)
        var userId = _currentUser.UserId;

        // 3. Tìm bản ghi người dùng trong CSDL bằng UserManager
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            throw new NotFoundException("Người dùng", userId);
        }

        // 4. Kiểm tra tài khoản có đang hoạt động hay đã bị khóa
        if (!user.IsActive)
        {
            throw new ForbiddenException("Tài khoản của bạn đã bị quản trị viên vô hiệu hóa.");
        }

        // 5. Lấy danh sách vai trò (Roles) của người dùng
        var roles = await _userManager.GetRolesAsync(user);

        // 6. Ánh xạ dữ liệu sang UserProfileDto - CHỈ CHỌN CÁC TRƯỜNG AN TOÀN
        // Tuân thủ NFR-SEC: Tuyệt đối KHÔNG trả về PasswordHash hoặc SecurityStamp
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