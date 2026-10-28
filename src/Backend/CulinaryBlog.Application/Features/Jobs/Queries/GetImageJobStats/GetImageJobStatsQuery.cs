using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Jobs.Queries.GetImageJobStats;

public record GetImageJobStatsQuery : IRequest<ImageJobStatsDto>;

public class GetImageJobStatsQueryHandler(IApplicationDbContext context, ICurrentUser user)
    : IRequestHandler<GetImageJobStatsQuery, ImageJobStatsDto>
{
    public async Task<ImageJobStatsDto> Handle(GetImageJobStatsQuery request, CancellationToken cancellationToken)
    {
        if (!user.IsAuthenticated) throw new UnauthorizedException("Vui lòng đăng nhập.");
        if (!user.IsAdmin) throw new ForbiddenException("Chỉ Admin được xem thống kê xử lý ảnh.");
        var total = await context.RecipeImages.CountAsync(cancellationToken);
        var thumbnails = await context.RecipeImages.CountAsync(i => i.ThumbnailUrl != null, cancellationToken);
        var medium = await context.RecipeImages.CountAsync(i => i.MediumUrl != null, cancellationToken);
        var recent = await context.RecipeImages.AsNoTracking().Where(i => i.ThumbnailUrl != null)
            .OrderByDescending(i => i.UpdatedAt).Take(5)
            .Select(i => new ProcessedImageDto(i.Id, i.RecipeId, i.OriginalUrl, i.ThumbnailUrl, i.MediumUrl))
            .ToListAsync(cancellationToken);
        return new ImageJobStatsDto(total, thumbnails, medium,
            "Phụ thuộc ảnh gốc; xem log để biết dung lượng giảm thực tế.",
            "300x300 WebP (Quality 75) tại bucket recipe-thumbnails",
            "Tối đa 800x600 WebP (Quality 75) tại bucket recipe-thumbnails", "recipe-thumbnails", recent);
    }
}
