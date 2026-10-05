// ============================================================================
// CHỨC NĂNG: FR-RCP-009 - Lấy danh sách nguyên liệu của một công thức món ăn
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeIngredients;

/// <summary>
/// Query yêu cầu lấy danh sách toàn bộ nguyên liệu của một công thức.
/// </summary>
public record GetRecipeIngredientsQuery(Guid RecipeId) : IRequest<IReadOnlyList<RecipeIngredientDto>>;

/// <summary>
/// Handler xử lý truy vấn danh sách nguyên liệu, tối ưu hiệu năng với AsNoTracking.
/// </summary>
public class GetRecipeIngredientsQueryHandler : IRequestHandler<GetRecipeIngredientsQuery, IReadOnlyList<RecipeIngredientDto>>
{
    private readonly IApplicationDbContext _dbContext;

    public GetRecipeIngredientsQueryHandler(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<RecipeIngredientDto>> Handle(GetRecipeIngredientsQuery request, CancellationToken ct)
    {
        // 1. Kiểm tra sự tồn tại của công thức
        var recipeExists = await _dbContext.Recipes
            .AsNoTracking()
            .AnyAsync(r => r.Id == request.RecipeId, ct);

        if (!recipeExists)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // 2. Truy vấn danh sách nguyên liệu sắp xếp theo OrderIndex tăng dần
        var ingredients = await _dbContext.RecipeIngredients
            .AsNoTracking()
            .Where(i => i.RecipeId == request.RecipeId)
            .OrderBy(i => i.OrderIndex)
            .Select(i => new RecipeIngredientDto(
                i.Id,
                i.Name,
                i.Quantity,
                i.Unit,
                i.Notes,
                i.OrderIndex
            ))
            .ToListAsync(ct);

        return ingredients;
    }
}
