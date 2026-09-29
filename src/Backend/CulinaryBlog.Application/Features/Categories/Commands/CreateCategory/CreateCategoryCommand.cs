using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Categories.Commands.CreateCategory;

// FR-CAT-003: Admin tạo danh mục mới (POST /api/v1/categories)
public record CreateCategoryCommand(
    string Name,
    string? Description = null,
    string? ImageUrl = null,
    int OrderIndex = 0
) : IRequest<CategoryDto>;
