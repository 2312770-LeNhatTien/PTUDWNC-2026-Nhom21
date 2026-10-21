using CulinaryBlog.Domain.Common;

namespace CulinaryBlog.Domain.Entities;

/// <summary>
/// FR-INT-001: Một người dùng chỉ được đánh giá một lần cho mỗi công thức.
/// Có thể cập nhật lại điểm và bình luận của chính mình.
/// </summary>
public class RecipeReview : BaseEntity
{
    public Guid RecipeId { get; private set; }
    public string AuthorId { get; private set; } = string.Empty;
    public int Rating { get; private set; }
    public string Comment { get; private set; } = string.Empty;

    public Recipe? Recipe { get; private set; }
    public ApplicationUser? Author { get; private set; }

    protected RecipeReview() { }

    public static RecipeReview Create(Guid recipeId, string authorId, int rating, string comment)
    {
        ValidateRating(rating);
        ArgumentException.ThrowIfNullOrWhiteSpace(authorId, nameof(authorId));
        ArgumentException.ThrowIfNullOrWhiteSpace(comment, nameof(comment));

        return new RecipeReview
        {
            RecipeId = recipeId,
            AuthorId = authorId.Trim(),
            Rating = rating,
            Comment = comment.Trim(),
        };
    }

    public void Update(int rating, string comment)
    {
        ValidateRating(rating);
        ArgumentException.ThrowIfNullOrWhiteSpace(comment, nameof(comment));
        Rating = rating;
        Comment = comment.Trim();
        Touch();
    }

    private static void ValidateRating(int rating)
    {
        if (rating is < 1 or > 5)
            throw new ArgumentOutOfRangeException(nameof(rating), "Điểm đánh giá phải từ 1 đến 5 sao.");
    }
}
