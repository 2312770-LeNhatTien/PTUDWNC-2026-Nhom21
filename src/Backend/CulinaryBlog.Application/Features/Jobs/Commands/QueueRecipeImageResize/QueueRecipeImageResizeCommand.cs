using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Jobs.Commands.QueueRecipeImageResize;

public record QueueRecipeImageResizeCommand(Guid RecipeId, Guid ImageId) : IRequest<ImageResizeRequestDto>;

public class QueueRecipeImageResizeCommandValidator : AbstractValidator<QueueRecipeImageResizeCommand>
{
    public QueueRecipeImageResizeCommandValidator()
    {
        RuleFor(x => x.RecipeId).NotEmpty();
        RuleFor(x => x.ImageId).NotEmpty();
    }
}

public class QueueRecipeImageResizeCommandHandler(IApplicationDbContext context, ICurrentUser user)
    : IRequestHandler<QueueRecipeImageResizeCommand, ImageResizeRequestDto>
{
    public async Task<ImageResizeRequestDto> Handle(QueueRecipeImageResizeCommand request, CancellationToken cancellationToken)
    {
        if (!user.IsAuthenticated) throw new UnauthorizedException("Vui lòng đăng nhập.");
        // Giữ kiểm tra quyền và quan hệ ảnh trong use case, kể cả khi gọi ngoài HTTP.
        if (!await context.Recipes.AnyAsync(r => r.Id == request.RecipeId && (user.IsAdmin || r.AuthorId == user.UserId), cancellationToken) ||
            !await context.RecipeImages.AnyAsync(i => i.Id == request.ImageId && i.RecipeId == request.RecipeId, cancellationToken))
            throw new NotFoundException("Không tìm thấy ảnh công thức thuộc quyền quản lý của bạn.");
        var pending = PendingJob.Resize(request.ImageId);
        context.PendingJobs.Add(pending);
        await context.SaveChangesAsync(cancellationToken);
        return new ImageResizeRequestDto("Đã lưu yêu cầu resize ảnh; worker sẽ xử lý khi được bật.",
            pending.Id, request.RecipeId, request.ImageId);
    }
}
