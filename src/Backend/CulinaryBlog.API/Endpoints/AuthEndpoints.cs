using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.Features.Auth.Commands.Login;
using CulinaryBlog.Application.Features.Auth.Commands.Logout;
using CulinaryBlog.Application.Features.Auth.Commands.RefreshToken;
using CulinaryBlog.Application.Features.Auth.Commands.Register;
using CulinaryBlog.Application.Features.Auth.Commands.UpdateProfile;
using CulinaryBlog.Application.Features.Auth.Queries.GetProfile;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup(/api/v1/auth).WithTags(Auth);

        // 1. Đăng ký tài khoản (FR-AUTH-001)
        group.MapPost(/register, async (
            RegisterRequest request,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var command = new RegisterCommand(
                Email: request.Email,
                Password: request.Password,
                DisplayName: request.DisplayName,
                UserName: request.UserName);

            var result = await mediator.Send(command, cancellationToken);
            return Results.Ok(ApiResponse.Ok(new
            {
                result.AccessToken,
                result.RefreshToken,
                result.User
            }));
        })
        .WithName(RegisterUser)
        .WithSummary(Đăng ký tài khoản mới (FR-AUTH-001));

        // 2. Đăng nhập (FR-AUTH-002)
        group.MapPost(/login, async (
            LoginRequest request,
            HttpContext httpContext,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString();
            var command = new LoginCommand(
                Email: request.Email,
                Password: request.Password,
                ClientIp: clientIp);

            var result = await mediator.Send(command, cancellationToken);
            return Results.Ok(ApiResponse.Ok(new
            {
                result.AccessToken,
                result.RefreshToken,
                result.User
            }));
        })
        .RequireRateLimiting(LoginRateLimitPolicy)
        .WithName(LoginUser)
        .WithSummary(Đăng nhập bằng Email và Mật khẩu (FR-AUTH-002));

        // ====================================================================
        // FR-AUTH-006 & FR-AUTH-007: XEM VÀ CẬP NHẬT HỒ SƠ CÁ NHÂN
        // Thành viên: Nguyễn Đình Tuấn (MSSV: 2312792)
        // Bảo mật: Lấy UserId từ Token (claim sub), không lộ PasswordHash
        // ====================================================================

        // 3. GET /api/v1/auth/me - Xem thông tin hồ sơ cá nhân (FR-AUTH-006)
        group.MapGet(/me, async (
            ISender sender,
            CancellationToken cancellationToken) =>
        {
            var query = new GetProfileQuery();
            var result = await sender.Send(query, cancellationToken);
            return Results.Ok(ApiResponse.Ok(result));
        })
        .RequireAuthorization()
        .WithName(GetProfile)
        .WithSummary(Xem thông tin hồ sơ người dùng hiện tại bảo mật không lộ mật khẩu (FR-AUTH-006));

        // 4. PATCH /api/v1/auth/me - Cập nhật hồ sơ cá nhân và ảnh đại diện (FR-AUTH-007)
        group.MapPatch(/me, async (
            UpdateProfileRequest request,
            ISender sender,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateProfileCommand(
                DisplayName: request.DisplayName,
                Bio: request.Bio,
                AvatarUrl: request.AvatarUrl);

            var result = await sender.Send(command, cancellationToken);
            return Results.Ok(ApiResponse.Ok(result));
        })
        .RequireAuthorization()
        .WithName(UpdateProfile)
        .WithSummary(Cập nhật hồ sơ cá nhân và liên kết ảnh MinIO (FR-AUTH-007));

        // 5. Đăng xuất (FR-AUTH-005)
        group.MapPost(/logout, async (
            LogoutRequest request,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var command = new LogoutCommand(request.RefreshToken);
            await mediator.Send(command, cancellationToken);
            return Results.NoContent();
        })
        .RequireAuthorization()
        .WithName(LogoutUser)
        .WithSummary(Đăng xuất và thu hồi Refresh Token (FR-AUTH-005))
        .Produces(StatusCodes.Status204NoContent);

        // 6. Làm mới Token (FR-AUTH-004)
        group.MapPost(/refresh, async (
            RefreshTokenRequest request,
            HttpContext httpContext,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString();
            var command = new RefreshTokenCommand(
                RefreshToken: request.RefreshToken,
                ClientIp: clientIp);

            var result = await mediator.Send(command, cancellationToken);
            return Results.Ok(ApiResponse.Ok(new
            {
                result.AccessToken,
                result.RefreshToken,
                result.User
            }));
        })
        .WithName(RefreshToken)
        .WithSummary(Làm mới Access Token qua Refresh Token Rotation (FR-AUTH-004));

        return app;
    }

    public sealed record RegisterRequest(
        string Email,
        string Password,
        string DisplayName,
        string? UserName);

    public sealed record LoginRequest(
        string Email,
        string Password);

    /// <summary>
    /// Model nhận dữ liệu từ request body khi cập nhật hồ sơ cá nhân (FR-AUTH-007).
    /// </summary>
    public sealed record UpdateProfileRequest(
        string? DisplayName = null,
        string? Bio = null,
        string? AvatarUrl = null);

    public sealed record LogoutRequest(
        string RefreshToken);

    public sealed record RefreshTokenRequest(
        string RefreshToken);
}
