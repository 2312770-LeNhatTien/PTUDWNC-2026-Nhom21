// ============================================================================
// CHỨC NĂNG: FR-RCP-008 - Quản lý gallery ảnh công thức (Xóa ảnh khỏi gallery)
// THÀNH VIÊN: Lê Nhật Tiến (MSSV: 2312770)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageImages;

public record DeleteRecipeImageCommand(Guid RecipeId, Guid ImageId) : IRequest;

public class DeleteRecipeImageCommandValidator : AbstractValidator<DeleteRecipeImageCommand>
{
    public DeleteRecipeImageCommandValidator()
    {
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        RuleFor(x => x.ImageId)
            .NotEmpty().WithMessage("ID hình ảnh không được để trống.");
    }
}

public class DeleteRecipeImageCommandHandler : IRequestHandler<DeleteRecipeImageCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public DeleteRecipeImageCommandHandler(IApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task Handle(DeleteRecipeImageCommand request, CancellationToken cancellationToken)
    {
        var recipe = await _context.Recipes
            .Include(r => r.Images)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, cancellationToken);

        if (recipe == null || recipe.IsDeleted)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // Kiểm tra quyền
        var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
        var isAdmin = _currentUser.IsAdmin;
        if (!isAuthor && !isAdmin)
        {
            throw new ForbiddenException("Bạn không có quyền quản lý ảnh của công thức này.");
        }

        var image = recipe.Images.FirstOrDefault(i => i.Id == request.ImageId && !i.IsDeleted);
        if (image == null)
        {
            throw new NotFoundException("Hình ảnh", request.ImageId);
        }

        var wasPrimary = image.IsPrimary;
        image.MarkDeleted();
        // Chỉ xóa riêng ảnh gallery mới dọn object; soft-delete Recipe vẫn giữ ảnh (D1).
        _context.PendingJobs.Add(CulinaryBlog.Domain.Entities.PendingJob.DeleteImage(image.Id));

        await _context.ExecuteInTransactionAsync(async () =>
        {
            // Loại ảnh cũ khỏi unique index trước khi đặt ảnh thay thế làm primary.
            await _context.SaveChangesAsync(cancellationToken);
            if (wasPrimary)
            {
                var nextImage = recipe.Images.Where(i => !i.IsDeleted && i.Id != image.Id).OrderBy(i => i.OrderIndex).FirstOrDefault();
                if (nextImage != null) { nextImage.SetPrimary(true); await _context.SaveChangesAsync(cancellationToken); }
            }
        }, cancellationToken);
    }
}
