using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Categories.Queries.GetCategories;

// FR-CAT-001: Xem danh sách danh mục (GET /api/v1/categories)
public record GetCategoriesQuery : IRequest<IReadOnlyList<CategoryDto>>;
