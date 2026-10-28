using System.Security.Claims;
using CulinaryBlog.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace CulinaryBlog.Infrastructure.Services;

// Đọc thông tin user từ JWT claims của request hiện tại, để tầng Application
// biết "ai đang gọi" mà không cần phụ thuộc HttpContext.
public class CurrentUserService : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUserService(IHttpContextAccessor accessor) => _accessor = accessor;

    private ClaimsPrincipal? User => _accessor.HttpContext?.User;

    public string? UserId => User?.FindFirstValue(ClaimTypes.NameIdentifier);

    public string? Email => User?.FindFirstValue(ClaimTypes.Email);

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public bool IsAdmin => User?.IsInRole("Admin") ?? false;

    public IReadOnlyList<string> Roles => GetRoles();

    private IReadOnlyList<string> GetRoles() =>
        User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray() ?? [];
}
