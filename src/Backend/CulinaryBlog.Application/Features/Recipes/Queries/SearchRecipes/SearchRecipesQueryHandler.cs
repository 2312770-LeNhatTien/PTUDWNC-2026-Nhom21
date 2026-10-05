using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Interfaces;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Queries.SearchRecipes;

public class SearchRecipesQueryHandler : IRequestHandler<SearchRecipesQuery, PagedResult<RecipeListItemDto>>
{
    private readonly IRecipeRepository _recipeRepository;

    public SearchRecipesQueryHandler(IRecipeRepository recipeRepository)
    {
        _recipeRepository = recipeRepository;
    }

    public async Task<PagedResult<RecipeListItemDto>> Handle(SearchRecipesQuery request, CancellationToken ct)
    {
        int page = request.Paging.Page is > 0 ? request.Paging.Page.Value : 1;
        int pageSize = request.Paging.PageSize is > 0 ? request.Paging.PageSize.Value : 10;

        var (items, total) = await _recipeRepository.SearchAsync(request.Query, page, pageSize, ct);

        var dtos = items.Select(r => new RecipeListItemDto(
            r.Id,
            r.Title,
            r.Slug,
            r.Description,
            r.PrepTime,
            r.CookTime,
            r.Servings,
            r.Difficulty.ToString(),
            r.Status.ToString(),
            r.Images.FirstOrDefault(i => i.IsPrimary) != null ? r.Images.FirstOrDefault(i => i.IsPrimary)!.OriginalUrl : null,
            r.Category != null ? r.Category.Name : "Khác",
            r.Author != null ? r.Author.DisplayName : "Đầu bếp",
            r.PublishedAt
        )).ToList();

        return new PagedResult<RecipeListItemDto>(dtos, page, pageSize, total);
    }
}
