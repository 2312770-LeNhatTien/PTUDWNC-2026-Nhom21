using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace CulinaryBlog.Infrastructure.Persistence;

// SRS mục 6.2 - DbContext chính của hệ thống.
// Kế thừa IdentityDbContext để có sẵn các bảng AspNetUsers, AspNetRoles...
public class CulinaryBlogDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    public CulinaryBlogDbContext(DbContextOptions<CulinaryBlogDbContext> options)
        : base(options) { }

    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeStep> RecipeSteps => Set<RecipeStep>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
    public DbSet<RecipeImage> RecipeImages => Set<RecipeImage>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<RecipeReview> RecipeReviews => Set<RecipeReview>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Nạp tất cả IEntityTypeConfiguration trong thư mục Configurations.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CulinaryBlogDbContext).Assembly);

        // SRS mục 7.1 - Global Query Filter cho soft delete: mọi truy vấn tự
        // động thêm WHERE IsDeleted = false, không cần nhớ lọc thủ công.
        // Khi cần lấy cả bản ghi đã xóa (vd trang khôi phục của Admin),
        // dùng .IgnoreQueryFilters().
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(BaseEntity).IsAssignableFrom(entityType.ClrType)) continue;

            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var property = Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
            var filter = Expression.Lambda(Expression.Not(property), parameter);
            entityType.SetQueryFilter(filter);
        }
    }
}
