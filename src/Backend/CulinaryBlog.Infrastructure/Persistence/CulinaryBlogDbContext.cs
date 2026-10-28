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
    public DbSet<PendingJob> PendingJobs => Set<PendingJob>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<CacheVersion>().HasKey(x => x.Id);
        builder.Entity<CacheVersion>().Property(x => x.Revision).HasMaxLength(32);
        builder.Entity<CacheVersion>().HasData(new CacheVersion());

        // Nạp tất cả IEntityTypeConfiguration trong thư mục Configurations.
        builder.ApplyConfigurationsFromAssembly(typeof(CulinaryBlogDbContext).Assembly);

        // SRS mục 7.1 - Global Query Filter cho soft delete: mọi truy vấn tự
        // động thêm WHERE IsDeleted = false, không cần nhớ lọc thủ công.
        // Khi cần lấy cả bản ghi đã xóa (vd trang khôi phục của Admin),
        // dùng .IgnoreQueryFilters().
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (!typeof(BaseEntity).IsAssignableFrom(entityType.ClrType)) continue;

            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var property = Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
            var filter = Expression.Lambda(Expression.Not(property), parameter);
            entityType.SetQueryFilter(filter);
        }
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var changesPublicData = ChangeTracker.Entries().Any(e =>
            e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted &&
            e.Entity is Recipe or Category or RecipeImage or RecipeIngredient or RecipeStep or RecipeReview or ApplicationUser &&
            // Draft mới chưa xuất hiện ở query công khai, không cần tranh khóa revision chung.
            !(e.State == EntityState.Added && e.Entity is Recipe { Status: CulinaryBlog.Domain.Enums.RecipeStatus.Draft }));
        if (changesPublicData)
        {
            // Version và dữ liệu đổi trong cùng transaction: Redis phục hồi không đọc lại key cũ.
            var version = await Set<CacheVersion>().SingleAsync(x => x.Id == 1, cancellationToken);
            version.Advance();
        }
        return await base.SaveChangesAsync(cancellationToken);
    }

    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken cancellationToken = default)
    {
        if (Database.CurrentTransaction != null) { await action(); return; }
        await using var transaction = await Database.BeginTransactionAsync(cancellationToken);
        await action();
        await transaction.CommitAsync(cancellationToken);
    }
}
