// ============================================================================
// CHỨC NĂNG: FR-RCP-009 - Quản lý nguyên liệu (Xóa nguyên liệu khỏi công thức)
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// QUYẾT ĐỊNH KIẾN TRÚC TUÂN THỦ: D10 & SRS 7.4 (Tự động đánh lại thứ tự liên tục)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageIngredients;

/// <summary>
/// DTO lệnh xóa một nguyên liệu khỏi công thức món ăn.
/// </summary>
public record DeleteRecipeIngredientCommand(
    Guid RecipeId,
    Guid IngredientId
) : IRequest<bool>;

/// <summary>
/// Validator kiểm tra tính hợp lệ của tham số ID trước khi xóa.
/// </summary>
public class DeleteRecipeIngredientCommandValidator : AbstractValidator<DeleteRecipeIngredientCommand>
{
    public DeleteRecipeIngredientCommandValidator()
    {
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        RuleFor(x => x.IngredientId)
            .NotEmpty().WithMessage("ID nguyên liệu cần xóa không được để trống.");
    }
}

/// <summary>
/// Handler xử lý xóa nguyên liệu và tự động đánh lại số thứ tự tuần tự (1, 2, 3...) cho các nguyên liệu còn lại.
/// </summary>
public class DeleteRecipeIngredientCommandHandler : IRequestHandler<DeleteRecipeIngredientCommand, bool>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public DeleteRecipeIngredientCommandHandler(
        IApplicationDbContext dbContext,
        ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(DeleteRecipeIngredientCommand request, CancellationToken ct)
    {
        // 1. Tải công thức kèm danh sách toàn bộ các nguyên liệu hiện có
        var recipe = await _dbContext.Recipes
            .Include(r => r.Ingredients)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, ct);

        if (recipe == null)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // 2. Kiểm tra phân quyền: Chỉ tác giả công thức hoặc Admin mới có quyền xóa
        if (_currentUser.IsAuthenticated)
        {
            var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
            var isAdmin = _currentUser.IsAdmin;
            if (!isAuthor && !isAdmin)
            {
                throw new ForbiddenException("Bạn không có quyền xóa nguyên liệu của công thức này.");
            }
        }

        // 3. Tìm nguyên liệu cần xóa
        var ingredientToDelete = recipe.Ingredients.FirstOrDefault(i => i.Id == request.IngredientId);
        if (ingredientToDelete == null)
        {
            throw new NotFoundException("Nguyên liệu", request.IngredientId);
        }

        // 4. Xóa nguyên liệu khỏi CSDL
        _dbContext.RecipeIngredients.Remove(ingredientToDelete);

        // 5. Tự động đánh lại số thứ tự (OrderIndex 1, 2, 3...) cho các nguyên liệu còn lại
        var remainingItems = recipe.Ingredients
            .Where(i => i.Id != request.IngredientId)
            .OrderBy(i => i.OrderIndex)
            .ToList();

        for (int i = 0; i < remainingItems.Count; i++)
        {
            remainingItems[i].Renumber(i + 1);
        }

        // 6. Lưu các thay đổi vào CSDL
        await _dbContext.SaveChangesAsync(ct);

        return true;
    }
}
