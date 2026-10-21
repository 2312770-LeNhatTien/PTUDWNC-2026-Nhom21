using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Common.Interfaces;

// Trừu tượng hóa DbContext để Application không phụ thuộc trực tiếp EF Core.
// Đa số Handler nên dùng IRepository/IUnitOfWork; interface này dành cho các
// truy vấn phức tạp cần LINQ trực tiếp.
public interface IApplicationDbContext
{
    DbSet<Recipe> Recipes { get; }
    DbSet<RecipeStep> RecipeSteps { get; }
    DbSet<RecipeIngredient> RecipeIngredients { get; }
    DbSet<RecipeImage> RecipeImages { get; }
    DbSet<Category> Categories { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<RecipeReview> RecipeReviews { get; }
    DbSet<ApplicationUser> Users { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
