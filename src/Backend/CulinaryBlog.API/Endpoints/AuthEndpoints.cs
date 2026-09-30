using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.Features.Auth.Commands.Login;
using CulinaryBlog.Application.Features.Auth.Commands.Logout;
using CulinaryBlog.Application.Features.Auth.Commands.RefreshToken;
using CulinaryBlog.Application.Features.Auth.Commands.Register;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapPost("/register", async (
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
        .WithName("RegisterUser")
        .WithSummary("Đăng ký tài khoản mới (FR-AUTH-001)");

        group.MapPost("/login", async (
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
        .RequireRateLimiting("LoginRateLimitPolicy")
        .WithName("LoginUser")
        .WithSummary("Đăng nhập bằng Email và Mật khẩu (FR-AUTH-002)");

        group.MapPost("/logout", async (
            LogoutRequest request,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var command = new LogoutCommand(request.RefreshToken);
            await mediator.Send(command, cancellationToken);
            return Results.NoContent();
        })
        .RequireAuthorization()
        .WithName("LogoutUser")
        .WithSummary("Đăng xuất và thu hồi Refresh Token (FR-AUTH-005)")
        .Produces(StatusCodes.Status204NoContent);

        group.MapPost("/refresh", async (
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
        .WithName("RefreshToken")
        .WithSummary("Làm mới Access Token qua Refresh Token Rotation (FR-AUTH-004)");

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

    public sealed record LogoutRequest(
        string RefreshToken);

    public sealed record RefreshTokenRequest(
        string RefreshToken);
}
