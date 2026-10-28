using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Enums;
using SlugVO = CulinaryBlog.Domain.ValueObjects.Slug;

namespace CulinaryBlog.Domain.Entities;

// SRS mục 7.2 - thực thể trung tâm của hệ thống (Aggregate Root).
// Một Recipe thuộc một Category và một Author, chứa Owned Entity RecipeNutrition
// và 3 collection: Steps, Ingredients, Images.
public class Recipe : BaseEntity
{
    public string Title { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Instructions { get; private set; } = string.Empty;
    public int PrepTime { get; private set; }   // phút, CHECK > 0
    public int CookTime { get; private set; }   // phút, CHECK >= 0 (0 = món không cần nấu)
    public int Servings { get; private set; }   // khẩu phần, CHECK > 0
    public RecipeDifficulty Difficulty { get; private set; } = RecipeDifficulty.Easy;
    public RecipeStatus Status { get; private set; } = RecipeStatus.Draft;

    public RecipeNutrition? Nutrition { get; private set; }

    public Guid CategoryId { get; private set; }
    public string AuthorId { get; private set; } = string.Empty;

    // Thời điểm publish, NULL nếu chưa publish (SRS mục 7.2).
    public DateTime? PublishedAt { get; private set; }

    public Category? Category { get; private set; }
    public ApplicationUser? Author { get; private set; }
    public ICollection<RecipeStep> Steps { get; private set; } = new List<RecipeStep>();
    public ICollection<RecipeIngredient> Ingredients { get; private set; } = new List<RecipeIngredient>();
    public ICollection<RecipeImage> Images { get; private set; } = new List<RecipeImage>();
    public ICollection<RecipeReview> Reviews { get; private set; } = new List<RecipeReview>();

    protected Recipe() { }

    public static Recipe Create(string title, string description, string instructions,
        Guid categoryId, string authorId, int prepTime, int cookTime, int servings,
        RecipeDifficulty difficulty)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        ArgumentException.ThrowIfNullOrWhiteSpace(description, nameof(description));

        if (prepTime <= 0) throw new DomainException("Thời gian chuẩn bị phải lớn hơn 0 phút.");
        if (cookTime < 0) throw new DomainException("Thời gian nấu không được âm.");
        if (servings <= 0) throw new DomainException("Số khẩu phần phải lớn hơn 0.");

        return new Recipe
        {
            Title = title.Trim(),
            Slug = SlugVO.Create(title),
            Description = description.Trim(),
            Instructions = instructions?.Trim() ?? string.Empty,
            CategoryId = categoryId,
            AuthorId = authorId,
            PrepTime = prepTime,
            CookTime = cookTime,
            Servings = servings,
            Difficulty = difficulty,
            Status = RecipeStatus.Draft,
        };
    }

    // FR-RCP-004. Lưu ý (SRS mục 7.2): Slug KHÔNG đổi sau khi đã publish,
    // để tránh vỡ link đã được index bởi Google.
    public void UpdateDetails(string? title, string? description, string? instructions,
        Guid? categoryId, int? prepTime, int? cookTime, int? servings, RecipeDifficulty? difficulty)
    {
        if (!string.IsNullOrWhiteSpace(title))
        {
            Title = title.Trim();
            if (PublishedAt is null && Status != RecipeStatus.Published)
                Slug = SlugVO.Create(title);
        }

        if (!string.IsNullOrWhiteSpace(description)) Description = description.Trim();
        if (instructions is not null) Instructions = instructions.Trim();
        if (categoryId.HasValue) CategoryId = categoryId.Value;

        if (prepTime.HasValue)
        {
            if (prepTime.Value <= 0) throw new DomainException("Thời gian chuẩn bị phải lớn hơn 0 phút.");
            PrepTime = prepTime.Value;
        }
        if (cookTime.HasValue)
        {
            if (cookTime.Value < 0) throw new DomainException("Thời gian nấu không được âm.");
            CookTime = cookTime.Value;
        }
        if (servings.HasValue)
        {
            if (servings.Value <= 0) throw new DomainException("Số khẩu phần phải lớn hơn 0.");
            Servings = servings.Value;
        }
        if (difficulty.HasValue) Difficulty = difficulty.Value;

        Touch();
    }

    // FR-RCP-005: Draft -> Published
    public void Publish()
    {
        if (Steps.Count == 0)
            throw new DomainException("Công thức phải có ít nhất 1 bước thực hiện trước khi xuất bản.");
        if (Ingredients.Count == 0)
            throw new DomainException("Công thức phải có ít nhất 1 nguyên liệu trước khi xuất bản.");

        Status = RecipeStatus.Published;
        PublishedAt ??= DateTime.UtcNow;
        Touch();
    }

    // FR-RCP-005: Published -> Draft
    public void Unpublish()
    {
        Status = RecipeStatus.Draft;
        Touch();
    }

    // FR-RCP-006: Lưu trữ - ẩn khỏi danh sách công khai nhưng không xóa.
    public void Archive()
    {
        Status = RecipeStatus.Archived;
        Touch();
    }

    public void SetNutrition(RecipeNutrition? nutrition)
    {
        Nutrition = nutrition;
        Touch();
    }

    /// <summary>
    /// Cập nhật slug duy nhất (ví dụ thêm hậu tố "-2", "-3" khi bị trùng lặp slug trong CSDL).
    /// </summary>
    public void SetSlug(string uniqueSlug)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(uniqueSlug, nameof(uniqueSlug));
        Slug = uniqueSlug.Trim();
        Touch();
    }
}

