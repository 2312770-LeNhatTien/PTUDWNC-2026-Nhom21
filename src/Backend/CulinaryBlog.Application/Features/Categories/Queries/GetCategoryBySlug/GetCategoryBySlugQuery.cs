using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Categories.Queries.GetCategoryBySlug;

/// <summary>
/// FR-CAT-002: Query lấy thông tin chi tiết danh mục kèm danh sách công thức thuộc danh mục đó.
/// </summary>
public record GetCategoryBySlugQuery(string Slug, CulinaryBlog.Application.Common.Models.PagingParams? Paging = null)
    : IRequest<CategoryDetailDto>, CulinaryBlog.Application.Common.Interfaces.ICacheableQuery
{
    public TimeSpan CacheDuration => TimeSpan.FromMinutes(30);
}
