using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Application.Features.Recipes.Queries.GetRecipes;
using CulinaryBlog.Domain.Interfaces;
using MediatR;

namespace CulinaryBlog.Application.Features.Categories.Queries.GetCategoryBySlug;

public class GetCategoryBySlugQueryHandler(ICategoryRepository categories, ISender sender)
    : IRequestHandler<GetCategoryBySlugQuery, CategoryDetailDto>
{
    public async Task<CategoryDetailDto> Handle(GetCategoryBySlugQuery request, CancellationToken cancellationToken)
    {
        var category = await categories.GetBySlugAsync(request.Slug.Trim().ToLowerInvariant(), cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy danh mục.");
        // Dùng query public chung để category detail có cùng filter/sort/paging với danh sách.
        var page = await sender.Send(new GetRecipesQuery(request.Paging ?? new PagingParams(), category.Id), cancellationToken);
        return new CategoryDetailDto(category.Id, category.Name, category.Slug, category.Description,
            category.ImageUrl, category.OrderIndex, page.Total, page.Items,
            new PaginationMeta(page.Page, page.PageSize, page.Total, page.TotalPages, page.HasNextPage, page.HasPreviousPage));
    }
}
