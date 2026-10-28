using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Files.Commands.DeleteFile;

public record DeleteFileCommand(string FileUrl) : IRequest;

public class DeleteFileCommandValidator : AbstractValidator<DeleteFileCommand>
{
    public DeleteFileCommandValidator() => RuleFor(x => x.FileUrl).NotEmpty().MaximumLength(1000);
}

public class DeleteFileCommandHandler(IFileStorageService storage, IApplicationDbContext context, ICurrentUser user)
    : IRequestHandler<DeleteFileCommand>
{
    public async Task Handle(DeleteFileCommand request, CancellationToken cancellationToken)
    {
        if (!user.IsAuthenticated) throw new UnauthorizedException("Vui lòng đăng nhập.");
        await storage.EnsureOwnedUploadAsync(request.FileUrl, cancellationToken);
        // File đang được dùng phải gỡ bằng nghiệp vụ gallery/profile, không xóa object trực tiếp.
        if (await context.RecipeImages.IgnoreQueryFilters().AnyAsync(i =>
                i.OriginalUrl == request.FileUrl || i.MediumUrl == request.FileUrl || i.ThumbnailUrl == request.FileUrl, cancellationToken) ||
            await context.RecipeSteps.IgnoreQueryFilters().AnyAsync(s => s.ImageUrl == request.FileUrl, cancellationToken) ||
            await context.Users.AnyAsync(u => u.AvatarUrl == request.FileUrl, cancellationToken))
            throw new ConflictException("Ảnh đang được sử dụng. Hãy gỡ ảnh khỏi bài hoặc hồ sơ trước.", "FILE_IN_USE");
        context.PendingJobs.Add(PendingJob.DeleteFile(request.FileUrl));
        await context.SaveChangesAsync(cancellationToken);
    }
}
