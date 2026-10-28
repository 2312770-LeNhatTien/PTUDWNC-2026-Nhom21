namespace CulinaryBlog.Application.DTOs;

// SRS mục 8.2 - GET /categories
public record CategoryDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string? ImageUrl,
    int OrderIndex,
    int RecipeCount
);

// SRS mục 8.2 - GET /categories/{slug} (FR-CAT-002)
public record CategoryDetailDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string? ImageUrl,
    int OrderIndex,
    int RecipeCount,
    IReadOnlyList<RecipeListItemDto> Recipes,
    CulinaryBlog.Application.Common.Models.PaginationMeta? Meta = null
);
