namespace CulinaryBlog.Application.DTOs;

public record RecipeReviewDto(
    Guid Id,
    string AuthorId,
    string AuthorDisplayName,
    string? AuthorAvatarUrl,
    int Rating,
    string Comment,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record RecipeReviewsDto(
    decimal AverageRating,
    int ReviewCount,
    IReadOnlyList<RecipeReviewDto> Reviews
);
