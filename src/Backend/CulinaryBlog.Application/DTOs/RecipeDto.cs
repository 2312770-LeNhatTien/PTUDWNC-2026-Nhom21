namespace CulinaryBlog.Application.DTOs;

// Dùng cho danh sách công thức (FR-RCP-001) - chỉ các field cần cho card preview.
public record RecipeListItemDto(
    Guid Id,
    string Title,
    string Slug,
    string Description,
    int PrepTime,
    int CookTime,
    int Servings,
    string Difficulty,
    string Status,
    string? PrimaryImageUrl,
    string CategoryName,
    string AuthorDisplayName,
    DateTime? PublishedAt
);

// Dùng cho chi tiết công thức (FR-RCP-002) - kèm steps, ingredients, images, nutrition.
public record RecipeDetailDto(
    Guid Id,
    string Title,
    string Slug,
    string Description,
    string Instructions,
    int PrepTime,
    int CookTime,
    int Servings,
    string Difficulty,
    string Status,
    DateTime? PublishedAt,
    CategoryRefDto Category,
    AuthorRefDto Author,
    NutritionDto? Nutrition,
    IReadOnlyList<RecipeStepDto> Steps,
    IReadOnlyList<RecipeIngredientDto> Ingredients,
    IReadOnlyList<RecipeImageDto> Images,
    byte[]? RowVersion = null,
    DateTime? CreatedAt = null,
    DateTime? UpdatedAt = null
);

public record CategoryRefDto(Guid Id, string Name, string Slug);

public record AuthorRefDto(string Id, string DisplayName, string? AvatarUrl);

public record NutritionDto(
    decimal? Calories,
    decimal? Protein,
    decimal? Carbohydrates,
    decimal? Fat,
    decimal? Fiber,
    decimal? Sodium
);

// SRS mục 8.5
public record RecipeStepDto(
    Guid Id,
    int StepNumber,
    string Title,
    string Description,
    int? TimerMinutes,
    string? ImageUrl
);

// SRS mục 8.6
public record RecipeIngredientDto(
    Guid Id,
    string Name,
    decimal? Quantity,
    string? Unit,
    string? Notes,
    int OrderIndex
);

// SRS mục 8.4
public record RecipeImageDto(
    Guid Id,
    string OriginalUrl,
    string? MediumUrl,
    string? ThumbnailUrl,
    string? AltText,
    bool IsPrimary,
    int OrderIndex
);
