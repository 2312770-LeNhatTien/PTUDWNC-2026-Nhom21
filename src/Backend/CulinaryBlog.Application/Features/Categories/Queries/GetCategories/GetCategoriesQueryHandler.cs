using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Interfaces;
using CulinaryBlog.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Categories.Queries.GetCategories;

// Cache nằm ở pipeline; handler chỉ truy vấn nghiệp vụ để không có hai lớp cache chồng nhau.
public class GetCategoriesQueryHandler(ICategoryRepository categories)
    : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    public async Task<IReadOnlyList<CategoryDto>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
        => await categories.Query().AsNoTracking().OrderBy(c => c.OrderIndex)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Description, c.ImageUrl,
                c.OrderIndex, c.Recipes.Count(r => r.Status == RecipeStatus.Published && !r.IsDeleted)))
            .ToListAsync(cancellationToken);
}
