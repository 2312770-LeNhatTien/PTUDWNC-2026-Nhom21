using CulinaryBlog.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Auth.Commands.Logout;

/// <summary>
/// Handler xử lý thu hồi refresh token trong CSDL khi người dùng đăng xuất (FR-AUTH-005).
/// Quy tắc:
/// - Hash SHA-256 raw token để tìm TokenHash trong CSDL (SRS mục 7.8).
/// - Nếu tìm thấy và token chưa bị thu hồi, đánh dấu IsRevoked = true (RevokedAt = UtcNow).
/// - Hoạt động Idempotent: không gây lỗi nếu token không tồn tại hoặc đã bị thu hồi trước đó.
/// </summary>
public class LogoutCommandHandler : IRequestHandler<LogoutCommand>
{
    private readonly IJwtService _jwtService;
    private readonly IApplicationDbContext _context;

    public LogoutCommandHandler(IJwtService jwtService, IApplicationDbContext context)
    {
        _jwtService = jwtService;
        _context = context;
    }

    public async Task Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return;
        }

        // 1. Hash raw refresh token để tra cứu trong CSDL (SRS mục 7.8)
        var tokenHash = _jwtService.HashRefreshToken(request.RefreshToken);

        // 2. Tìm entity RefreshToken
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        // 3. Thu hồi token nếu tồn tại và chưa bị thu hồi
        if (token is not null && !token.IsRevoked)
        {
            token.Revoke();
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
