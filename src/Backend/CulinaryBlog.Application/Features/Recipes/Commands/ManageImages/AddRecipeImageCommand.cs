// ============================================================================
// CHỨC NĂNG: FR-RCP-008 - Quản lý gallery ảnh công thức (Thêm ảnh vào gallery)
// THÀNH VIÊN: Lê Nhật Tiến (MSSV: 2312770)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageImages;

public record AddRecipeImageCommand(
    Guid RecipeId,
    string OriginalUrl,
    string? AltText = null,
    bool IsPrimary = false,
    int? OrderIndex = null
) : IRequest<RecipeImageDto>;

public class AddRecipeImageCommandValidator : AbstractValidator<AddRecipeImageCommand>
{
    public AddRecipeImageCommandValidator()
    {
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        RuleFor(x => x.OriginalUrl)
            .NotEmpty().WithMessage("Đường dẫn ảnh (OriginalUrl) không được để trống.")
            .MaximumLength(1000).WithMessage("Đường dẫn ảnh không được vượt quá 1000 ký tự.");

        When(x => !string.IsNullOrWhiteSpace(x.AltText), () =>
        {
            RuleFor(x => x.AltText!)
                .MaximumLength(300).WithMessage("Văn bản thay thế (AltText) không được vượt quá 300 ký tự.");
        });
    }
}

public class AddRecipeImageCommandHandler : IRequestHandler<AddRecipeImageCommand, RecipeImageDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public AddRecipeImageCommandHandler(IApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<RecipeImageDto> Handle(AddRecipeImageCommand request, CancellationToken ct)
    {
        var recipe = await _context.Recipes
            .Include(r => r.Images)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, ct);

        if (recipe == null || recipe.IsDeleted)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // Kiểm tra quyền: chỉ tác giả hoặc Admin mới được thêm ảnh
        var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
        var isAdmin = _currentUser.IsAdmin;
        if (!isAuthor && !isAdmin)
        {
            throw new ForbiddenException("Bạn không có quyền quản lý ảnh của công thức này.");
        }

        var existingImages = recipe.Images.Where(i => !i.IsDeleted).ToList();
        var shouldBePrimary = request.IsPrimary || existingImages.Count == 0;

        // Nếu ảnh này là Primary, chuyển các ảnh cũ về false
        if (shouldBePrimary)
        {
            foreach (var img in existingImages.Where(i => i.IsPrimary))
            {
                img.SetPrimary(false);
            }
        }

        var orderIndex = request.OrderIndex ?? (existingImages.Count > 0 ? existingImages.Max(i => i.OrderIndex) + 1 : 0);

        var newImage = RecipeImage.Create(
            recipeId: recipe.Id,
            originalUrl: request.OriginalUrl,
            altText: request.AltText,
            isPrimary: shouldBePrimary,
            orderIndex: orderIndex
        );

        _context.RecipeImages.Add(newImage);
        await _context.SaveChangesAsync(ct);

        return new RecipeImageDto(
            newImage.Id,
            newImage.OriginalUrl,
            newImage.MediumUrl,
            newImage.ThumbnailUrl,
            newImage.AltText,
            newImage.IsPrimary,
            newImage.OrderIndex
        );
    }
}
