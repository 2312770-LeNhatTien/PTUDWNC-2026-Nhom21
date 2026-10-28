using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Enums;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipes;

// FR-RCP-001: Danh sách công thức (phân trang + lọc + sắp xếp).
// Đồng thời là nơi hiện thực FR-SRCH-002 (lọc), FR-SRCH-003 (sắp xếp),
// FR-SRCH-004 (phân trang) - 3 FR này gắn liền với endpoint này.
// SRS mục 8.3: GET /recipes?page&pageSize&sortBy&sortOrder&...
public record GetRecipesQuery(
    PagingParams Paging,
    Guid? CategoryId = null,
    RecipeDifficulty? Difficulty = null,
    int? MaxCookTime = null,    // lọc theo thời gian nấu (CookTime)
    int? MaxTotalTime = null,   // lọc theo tổng thời gian (PrepTime + CookTime)
    int? MinServings = null
) : IRequest<PagedResult<RecipeListItemDto>>, CulinaryBlog.Application.Common.Interfaces.ICacheableQuery
{
    public TimeSpan CacheDuration => TimeSpan.FromMinutes(5);
}
