using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Jobs.Commands.QueueMissingImageResizes;

public record QueueMissingImageResizesCommand : IRequest<ImageResizeBatchDto>;

public class QueueMissingImageResizesCommandHandler(IApplicationDbContext context, ICurrentUser user)
    : IRequestHandler<QueueMissingImageResizesCommand, ImageResizeBatchDto>
{
    public async Task<ImageResizeBatchDto> Handle(QueueMissingImageResizesCommand request, CancellationToken cancellationToken)
    {
        if (!user.IsAuthenticated) throw new UnauthorizedException("Vui lòng đăng nhập.");
        if (!user.IsAdmin) throw new ForbiddenException("Chỉ Admin được resize ảnh hàng loạt.");
        var imageIds = await context.RecipeImages.Where(i => i.ThumbnailUrl == null || i.MediumUrl == null)
            .Select(i => i.Id).ToListAsync(cancellationToken);
        foreach (var id in imageIds) context.PendingJobs.Add(PendingJob.Resize(id));
        await context.SaveChangesAsync(cancellationToken);
        return new ImageResizeBatchDto("Đã lưu yêu cầu xử lý các ảnh chưa có thumbnail/medium vào hàng chờ.",
            "pending-images", imageIds.Count);
    }
}
