using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CulinaryBlog.Tests;

public sealed class DatabaseSeederTests
{
    [Fact]
    public async Task Fresh_database_gets_complete_content_and_repeated_seed_keeps_edits()
    {
        // Fixture riêng để không làm thay đổi dữ liệu của các bài kiểm thử API khác.
        var fixture = new ApiFixture();
        try
        {
            await fixture.InitializeAsync();
            await DatabaseSeeder.SeedAsync(fixture.Services);
            using var scope = fixture.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var author = (await users.FindByEmailAsync("2312770@dlu.edu.vn"))!;
            Assert.Null(author.PasswordHash);
            Assert.True(await users.IsInRoleAsync(author, "Author"));
            Assert.Equal(30, await db.Recipes.CountAsync());
            Assert.Equal(295, await db.RecipeIngredients.CountAsync());
            Assert.Equal(95, await db.RecipeSteps.CountAsync());
            Assert.Equal(30, await db.RecipeImages.CountAsync());
            Assert.Equal(27, await db.RecipeSteps.CountAsync(s => s.ImageUrl != null));
            Assert.All(await db.RecipeImages.ToListAsync(), i => Assert.StartsWith("/recipe-images/", i.OriginalUrl));
            Assert.All(await db.Recipes.ToListAsync(), r =>
            {
                Assert.Equal(RecipeStatus.Published, r.Status);
                Assert.Equal(author.Id, r.AuthorId);
                Assert.Null(r.Nutrition);
            });

            var edited = await db.Recipes.Include(r => r.Images).FirstAsync();
            edited.UpdateDetails(null, "Mô tả thành viên sửa", "Hướng dẫn thành viên sửa", null, null, null, null, null);
            await db.SaveChangesAsync();
            var image = edited.Images.Single();
            db.Entry(image).Property(i => i.OriginalUrl).CurrentValue = "/my-new-picture.jpg";
            var deleted = await db.Recipes.FirstAsync(r => r.Id != edited.Id);
            deleted.MarkDeleted();
            await db.SaveChangesAsync();
            var revision = (await db.Set<CacheVersion>().SingleAsync()).Revision;
            await DatabaseSeeder.SeedAsync(fixture.Services);
            db.ChangeTracker.Clear();
            Assert.Equal(30, await db.Recipes.IgnoreQueryFilters().CountAsync());
            Assert.Equal(29, await db.Recipes.CountAsync());
            Assert.Equal("Hướng dẫn thành viên sửa", (await db.Recipes.SingleAsync(r => r.Id == edited.Id)).Instructions);
            Assert.Equal("/my-new-picture.jpg", (await db.RecipeImages.SingleAsync(i => i.Id == image.Id)).OriginalUrl);
            Assert.Equal(revision, (await db.Set<CacheVersion>().SingleAsync()).Revision);
        }
        finally { await ((IAsyncLifetime)fixture).DisposeAsync(); }
    }

    [Fact]
    public async Task Cleanup_removes_only_legacy_content_and_preserves_existing_author_credentials()
    {
        var fixture = new ApiFixture();
        try
        {
            await fixture.InitializeAsync();
            using var scope = fixture.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var author = ApplicationUser.Create("2312770@dlu.edu.vn", "Lê Nhật Tiến");
            Assert.True((await users.CreateAsync(author, ApiFixture.Password)).Succeeded);
            var hash = author.PasswordHash;
            var demo = ApplicationUser.Create("bep_truong_an@culinary.local", "Tác giả cũ");
            Assert.True((await users.CreateAsync(demo)).Succeeded);
            var fake = Recipe.Create("Cách làm Món thử #99", "Mô tả mẫu",
                "Lần lượt thực hiện các bước chuẩn bị, sơ chế, xào nấu và trình bày theo đúng hướng dẫn kỹ thuật bên dưới để đạt chuẩn vị nhà hàng.",
                fixture.CategoryId, demo.Id, 10, 20, 2, RecipeDifficulty.Easy);
            fake.Ingredients.Add(RecipeIngredient.Create(fake.Id, "Muối"));
            var real = Recipe.Create("Bài thật tạo thêm", "Mô tả thật", "Hướng dẫn thật đã sửa",
                fixture.CategoryId, demo.Id, 10, 20, 2, RecipeDifficulty.Easy);
            db.Recipes.AddRange(fake, real);
            await db.SaveChangesAsync();
            var revision = (await db.Set<CacheVersion>().SingleAsync()).Revision;

            await DatabaseSeeder.SeedAsync(fixture.Services);
            db.ChangeTracker.Clear();
            Assert.False(await db.Recipes.IgnoreQueryFilters().AnyAsync(r => r.Id == fake.Id));
            Assert.False(await db.RecipeIngredients.IgnoreQueryFilters().AnyAsync(i => i.RecipeId == fake.Id));
            Assert.True(await db.Recipes.AnyAsync(r => r.Id == real.Id));
            Assert.NotNull(await users.FindByEmailAsync(demo.Email!));
            var preserved = (await users.FindByEmailAsync(author.Email!))!;
            Assert.Equal(author.Id, preserved.Id);
            Assert.Equal(hash, preserved.PasswordHash);
            Assert.True(await users.CheckPasswordAsync(preserved, ApiFixture.Password));
            Assert.Equal(31, await db.Recipes.CountAsync());
            Assert.NotEqual(revision, (await db.Set<CacheVersion>().SingleAsync()).Revision);
        }
        finally { await ((IAsyncLifetime)fixture).DisposeAsync(); }
    }
}
