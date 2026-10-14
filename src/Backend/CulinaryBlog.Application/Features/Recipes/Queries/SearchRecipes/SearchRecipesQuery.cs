using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Queries.SearchRecipes;

// FR-SRCH-001: Tìm kiếm toàn văn (PostgreSQL unaccent)
public record SearchRecipesQuery(
    string Query,
    PagingParams Paging,
    Guid? CategoryId = null,
    CulinaryBlog.Domain.Enums.RecipeDifficulty? Difficulty = null,
    int? MaxCookTime = null
) : IRequest<PagedResult<RecipeListItemDto>>;
