// ============================================================================
// CHỨC NĂNG: FR-RCP-008 - Quản lý gallery ảnh công thức (Chọn ảnh đại diện chính)
// THÀNH VIÊN: Lê Nhật Tiến (MSSV: 2312770)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageImages;

public record SetPrimaryImageCommand(Guid RecipeId, Guid ImageId) : IRequest<RecipeImageDto>;

public class SetPrimaryImageCommandValidator : AbstractValidator<SetPrimaryImageCommand>
{
    public SetPrimaryImageCommandValidator()
    {
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        RuleFor(x => x.ImageId)
            .NotEmpty().WithMessage("ID hình ảnh không được để trống.");
    }
}

public class SetPrimaryImageCommandHandler : IRequestHandler<SetPrimaryImageCommand, RecipeImageDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public SetPrimaryImageCommandHandler(IApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<RecipeImageDto> Handle(SetPrimaryImageCommand request, CancellationToken ct)
    {
        var recipe = await _context.Recipes
            .Include(r => r.Images)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, ct);

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

        var activeImages = recipe.Images.Where(i => !i.IsDeleted).ToList();
        var targetImage = activeImages.FirstOrDefault(i => i.Id == request.ImageId);
        if (targetImage == null)
        {
            throw new NotFoundException("Hình ảnh", request.ImageId);
        }

        // Đảm bảo chỉ có DUY NHẤT 1 ảnh có IsPrimary = true
        foreach (var img in activeImages)
        {
            img.SetPrimary(img.Id == request.ImageId);
        }

        await _context.SaveChangesAsync(ct);

        return new RecipeImageDto(
            targetImage.Id,
            targetImage.OriginalUrl,
            targetImage.MediumUrl,
            targetImage.ThumbnailUrl,
            targetImage.AltText,
            targetImage.IsPrimary,
            targetImage.OrderIndex
        );
    }
}
