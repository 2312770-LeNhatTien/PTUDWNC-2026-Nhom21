using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Queries.SearchRecipes;

// FR-SRCH-001: Tìm kiếm toàn văn (PostgreSQL unaccent)
public record SearchRecipesQuery(
    string Query,
    PagingParams Paging
) : IRequest<PagedResult<RecipeListItemDto>>;
