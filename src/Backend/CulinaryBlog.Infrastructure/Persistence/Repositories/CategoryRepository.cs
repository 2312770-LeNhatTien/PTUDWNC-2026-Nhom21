using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Persistence.Repositories;

public class CategoryRepository : Repository<Category>, ICategoryRepository
{
    public CategoryRepository(CulinaryBlogDbContext db) : base(db) { }

    public async Task<Category?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await Db.Categories.FirstOrDefaultAsync(c => c.Slug == slug, ct);

    // excludeId dùng khi cập nhật: bỏ qua chính danh mục đang sửa.
    public async Task<bool> NameExistsAsync(string name, Guid? excludeId = null, CancellationToken ct = default)
    {
        // Bảo lưu tên/slug đã xóa mềm, khớp unique index và tránh tái dùng URL cũ.
        var query = Db.Categories.IgnoreQueryFilters().Where(c => c.Name.ToLower() == name.ToLower().Trim());
        if (excludeId.HasValue)
            query = query.Where(c => c.Id != excludeId.Value);
        return await query.AnyAsync(ct);
    }

    // FR-CAT-005: không cho xóa danh mục còn công thức (kể cả Draft).
    public async Task<bool> HasRecipesAsync(Guid categoryId, CancellationToken ct = default)
        => await Db.Recipes.AnyAsync(r => r.CategoryId == categoryId, ct);
}
