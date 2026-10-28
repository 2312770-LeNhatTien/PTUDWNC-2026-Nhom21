using CulinaryBlog.Domain.Entities;

namespace CulinaryBlog.Domain.Interfaces;

// SRS mục 6.2 - repository riêng cho Recipe, thêm các truy vấn đặc thù.
public interface IRecipeRepository : IRepository<Recipe>
{
    // Lấy recipe kèm đầy đủ Steps/Ingredients/Images/Category/Author (FR-RCP-002).
    Task<Recipe?> GetDetailBySlugAsync(string slug, CancellationToken ct = default);
    Task<Recipe?> GetDetailByIdAsync(Guid id, CancellationToken ct = default);

    Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default);

    // FR-SRCH-001: Full-Text Search dùng PostgreSQL tsvector + unaccent.
    Task<(IReadOnlyList<Recipe> Items, int Total)> SearchAsync(
        string keyword, int page, int pageSize, CancellationToken ct = default,
        Guid? categoryId = null, CulinaryBlog.Domain.Enums.RecipeDifficulty? difficulty = null,
        int? maxCookTime = null, string? sortBy = null, bool descending = true,
        int? minServings = null, int? maxTotalTime = null);
}
