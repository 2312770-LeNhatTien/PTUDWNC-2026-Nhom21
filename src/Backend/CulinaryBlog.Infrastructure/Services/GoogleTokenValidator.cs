using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;

namespace CulinaryBlog.Infrastructure.Services;

public sealed class GoogleTokenValidator(IConfiguration configuration) : IGoogleTokenValidator
{
    public async Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken ct)
    {
        var clientId = configuration["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            throw new ValidationException("GOOGLE_NOT_CONFIGURED", "Google Sign-In chưa được cấu hình trên server.");
        try
        {
            // Chữ ký hợp lệ chưa đủ: token phải dành đúng ứng dụng và email đã xác minh.
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } }).WaitAsync(ct);
            if (!payload.EmailVerified || string.IsNullOrWhiteSpace(payload.Email) || string.IsNullOrWhiteSpace(payload.Subject))
                throw new UnauthorizedException("Tài khoản Google chưa xác minh email.");
            return new(payload.Subject, payload.Email, payload.Name, payload.Picture);
        }
        catch (InvalidJwtException) { throw new UnauthorizedException("Token Google không hợp lệ hoặc đã hết hạn."); }
    }
}
