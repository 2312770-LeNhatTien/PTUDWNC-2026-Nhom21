using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeBySlug;

// FR-RCP-002: Chi tiết công thức theo slug (kèm steps, ingredients, images, nutrition).
// SRS mục 8.3: GET /recipes/{slug}
// Recipe ở trạng thái Draft chỉ chủ sở hữu hoặc Admin mới xem được.
public record GetRecipeBySlugQuery(string Slug) : IRequest<RecipeDetailDto>, CulinaryBlog.Application.Common.Interfaces.ICacheableQuery
{
    public TimeSpan CacheDuration => TimeSpan.FromMinutes(10);
}
