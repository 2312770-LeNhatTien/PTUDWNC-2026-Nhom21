using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Persistence.Repositories;

public class RecipeRepository : Repository<Recipe>, IRecipeRepository
{
    public RecipeRepository(CulinaryBlogDbContext db) : base(db) { }

    // AsSplitQuery: Recipe có 3 collection (Steps/Ingredients/Images), nếu JOIN
    // hết trong 1 câu SQL sẽ sinh ra tích Descartes rất nhiều dòng thừa.
    // AsSplitQuery tách thành nhiều câu SQL nhỏ, tổng dữ liệu ít hơn hẳn.
    public async Task<Recipe?> GetDetailBySlugAsync(string slug, CancellationToken ct = default)
        => await BuildDetailQuery().FirstOrDefaultAsync(r => r.Slug == slug, ct);

    public async Task<Recipe?> GetDetailByIdAsync(Guid id, CancellationToken ct = default)
        => await BuildDetailQuery().FirstOrDefaultAsync(r => r.Id == id, ct);

    private IQueryable<Recipe> BuildDetailQuery()
        => Db.Recipes
            .AsSplitQuery()
            .Include(r => r.Category)
            .Include(r => r.Author)
            .Include(r => r.Steps.OrderBy(s => s.StepNumber))
            .Include(r => r.Ingredients.OrderBy(i => i.OrderIndex))
            .Include(r => r.Images.OrderBy(i => i.OrderIndex));

    public async Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default)
        => await Db.Recipes.AnyAsync(r => r.Slug == slug, ct);

    // FR-SRCH-001: Vietnamese unaccent full-text search with filters before pagination.
    public async Task<(IReadOnlyList<Recipe> Items, int Total)> SearchAsync(
        string keyword, int page, int pageSize, CancellationToken ct = default,
        Guid? categoryId = null, CulinaryBlog.Domain.Enums.RecipeDifficulty? difficulty = null,
        int? maxCookTime = null, string? sortBy = null, bool descending = true)
    {
        var query = Db.Recipes
            .AsNoTracking()
            .Include(r => r.Category)
            .Include(r => r.Author)
            .Include(r => r.Images)
            .Where(r => r.Status == Domain.Enums.RecipeStatus.Published && !r.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query
                .Where(r => EF.Functions.ToTsVector("simple", EF.Functions.Unaccent(r.Title)).Matches(EF.Functions.PlainToTsQuery("simple", EF.Functions.Unaccent(keyword))));
        }

        if (categoryId.HasValue) query = query.Where(r => r.CategoryId == categoryId.Value);
        if (difficulty.HasValue) query = query.Where(r => r.Difficulty == difficulty.Value);
        if (maxCookTime.HasValue) query = query.Where(r => r.CookTime <= maxCookTime.Value);
        query = sortBy?.ToLowerInvariant() switch
        {
            "title" => descending ? query.OrderByDescending(r => r.Title).ThenBy(r => r.Id) : query.OrderBy(r => r.Title).ThenBy(r => r.Id),
            "cooktime" => descending ? query.OrderByDescending(r => r.CookTime).ThenBy(r => r.Id) : query.OrderBy(r => r.CookTime).ThenBy(r => r.Id),
            "difficulty" => descending ? query.OrderByDescending(r => r.Difficulty).ThenBy(r => r.Id) : query.OrderBy(r => r.Difficulty).ThenBy(r => r.Id),
            _ => descending ? query.OrderByDescending(r => r.CreatedAt).ThenBy(r => r.Id) : query.OrderBy(r => r.CreatedAt).ThenBy(r => r.Id)
        };
        var total = await query.CountAsync(ct);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }
}
