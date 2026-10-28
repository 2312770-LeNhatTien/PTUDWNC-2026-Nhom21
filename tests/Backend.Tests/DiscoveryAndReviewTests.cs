using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CulinaryBlog.Application.Features.Seo.Queries.GetSitemapEntries;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Tests;

[Collection("api")]
public sealed class DiscoveryAndReviewTests(ApiFixture app)
{
    [Fact]
    public async Task New_private_draft_does_not_invalidate_public_cache()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CulinaryBlog.Infrastructure.Persistence.CulinaryBlogDbContext>();
        var version = await db.Set<CulinaryBlog.Domain.Entities.CacheVersion>().AsNoTracking()
            .Select(x => x.Revision).SingleAsync();
        await app.CreateRecipeAsync();
        var after = await db.Set<CulinaryBlog.Domain.Entities.CacheVersion>().AsNoTracking().Select(x => x.Revision).SingleAsync();
        Assert.Equal(version, after);
    }

    [Fact]
    public async Task Public_detail_review_and_own_list_form_one_complete_author_flow()
    {
        var recipe = await app.CreateRecipeAsync(content: true); var id = recipe.GetProperty("id").GetGuid();
        var slug = recipe.GetProperty("slug").GetString();
        Assert.Equal(HttpStatusCode.Forbidden, (await app.Guest.GetAsync($"/api/v1/recipes/{slug}")).StatusCode);
        (await app.Owner.GetAsync($"/api/v1/recipes/{slug}")).EnsureSuccessStatusCode();
        (await app.Admin.GetAsync($"/api/v1/recipes/{slug}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.GetAsync("/api/v1/recipes/mine")).StatusCode);
        var mine = await ApiFixture.DataAsync(await app.Owner.GetAsync("/api/v1/recipes/mine?status=Draft&pageSize=50"));
        Assert.Contains(mine.EnumerateArray(), item => item.GetProperty("id").GetGuid() == id);
        (await app.Owner.PatchAsync($"/api/v1/recipes/{id}/publish", null)).EnsureSuccessStatusCode();
        var before = await ApiFixture.DataAsync(await app.Guest.GetAsync($"/api/v1/recipes/{slug}"));
        Assert.Equal(0, before.GetProperty("reviewCount").GetInt32());
        var empty = await ApiFixture.DataAsync(await app.Guest.GetAsync($"/api/v1/recipes/{id}/reviews"));
        Assert.Equal(0, empty.GetProperty("reviewCount").GetInt32());
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.Guest.PostAsJsonAsync($"/api/v1/recipes/{id}/reviews", new { rating = 5, comment = "Món ngon" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await app.Other.PostAsJsonAsync($"/api/v1/recipes/{id}/reviews", new { rating = 6, comment = "Sai điểm" })).StatusCode);
        (await app.Other.PostAsJsonAsync($"/api/v1/recipes/{id}/reviews", new { rating = 5, comment = "Món ngon, dễ làm" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await app.Other.PostAsJsonAsync($"/api/v1/recipes/{id}/reviews", new { rating = 4, comment = "Lặp" })).StatusCode);
        var reviews = await ApiFixture.DataAsync(await app.Guest.GetAsync($"/api/v1/recipes/{id}/reviews"));
        Assert.Equal(1, reviews.GetProperty("reviewCount").GetInt32());
        Assert.Equal(5, reviews.GetProperty("averageRating").GetDecimal());
        // Cùng URL đã warm cache nhưng review mới phải xuất hiện nhờ DB CacheVersion.
        var after = await ApiFixture.DataAsync(await app.Guest.GetAsync($"/api/v1/recipes/{slug}"));
        Assert.Equal(1, after.GetProperty("reviewCount").GetInt32());
        using var scope = app.Services.CreateScope();
        var urls = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new GetSitemapEntriesQuery());
        Assert.Contains(urls, entry => entry.Path == "/recipes/" + Uri.EscapeDataString(slug!));
        (await app.Owner.DeleteAsync($"/api/v1/recipes/{id}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await app.Guest.GetAsync($"/api/v1/recipes/{slug}")).StatusCode);
    }

    [Fact]
    public async Task Category_updates_keep_slug_and_author_cannot_administer_categories()
    {
        var name = "Danh mục " + Guid.NewGuid().ToString("N");
        Assert.Equal(HttpStatusCode.Forbidden, (await app.Owner.PostAsJsonAsync("/api/v1/categories", new { name })).StatusCode);
        var category = await ApiFixture.DataAsync(await app.Admin.PostAsJsonAsync("/api/v1/categories", new { name, description = "Trước", orderIndex = 2 }));
        var id = category.GetProperty("id").GetGuid();
        var updated = await ApiFixture.DataAsync(await app.Admin.PutAsJsonAsync($"/api/v1/categories/{id}", new { name = name + " mới", description = "Sau", orderIndex = 1 }));
        Assert.Equal(category.GetProperty("slug").GetString(), updated.GetProperty("slug").GetString());
        var list = await ApiFixture.DataAsync(await app.Guest.GetAsync("/api/v1/categories"));
        Assert.Contains(list.EnumerateArray(), c => c.GetProperty("name").GetString() == name + " mới");
        Assert.Equal(HttpStatusCode.NotFound, (await app.Guest.GetAsync("/api/v1/categories/not-a-category")).StatusCode);
    }

    [Fact]
    public async Task Nutrition_and_optional_fields_survive_creation_and_public_mapping()
    {
        var recipe = await ApiFixture.DataAsync(await app.Owner.PostAsJsonAsync("/api/v1/recipes", new
        {
            title = "Dinh dưỡng " + Guid.NewGuid().ToString("N"), description = "Món ngon", instructions = "Nấu kỹ", categoryId = app.CategoryId,
            prepTime = 5, cookTime = 0, servings = 2, difficulty = "Medium",
            nutrition = new { calories = 120, protein = 10, carbohydrates = 15, fat = 5, fiber = 2, sodium = 1 },
            ingredients = new[] { new { name = "Gạo", quantity = 0.5, unit = "bát", notes = "Vo sạch", orderIndex = 1 } },
            steps = new[] { new { title = "Nấu", description = "Đun kỹ", timerMinutes = 10, stepNumber = 1 } }
        }));
        var id = recipe.GetProperty("id").GetGuid();
        Assert.Equal(120, recipe.GetProperty("nutrition").GetProperty("calories").GetDecimal());
        (await app.Owner.PatchAsync($"/api/v1/recipes/{id}/publish", null)).EnsureSuccessStatusCode();
        var detail = await ApiFixture.DataAsync(await app.Guest.GetAsync("/api/v1/recipes/" + recipe.GetProperty("slug").GetString()));
        Assert.Equal(10, detail.GetProperty("steps")[0].GetProperty("timerMinutes").GetInt32());
        Assert.Equal(0.5m, detail.GetProperty("ingredients")[0].GetProperty("quantity").GetDecimal());
        Assert.Equal(120, detail.GetProperty("nutrition").GetProperty("calories").GetDecimal());
    }

    [Theory]
    [InlineData(0)] [InlineData(-1)]
    public async Task Invalid_quantities_are_validation_errors_not_database_errors(decimal quantity)
    {
        var recipe = await app.CreateRecipeAsync();
        var response = await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{recipe.GetProperty("id")}/ingredients", new { name = "Muối", quantity, unit = "g" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("VALIDATION_FAILED", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errorCode").GetString());
    }
}
