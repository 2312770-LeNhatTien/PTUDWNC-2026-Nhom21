using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CulinaryBlog.Tests;

[Collection("api")]
public sealed class RecipeApiTests(ApiFixture app)
{
    [Theory]
    [InlineData("guest", "POST", 401)] [InlineData("other", "POST", 403)]
    [InlineData("guest", "PUT", 401)] [InlineData("other", "PUT", 403)]
    [InlineData("guest", "DELETE", 401)] [InlineData("other", "DELETE", 403)]
    public async Task Steps_reject_non_owner_without_changing_data(string role, string method, int status)
    {
        var recipe = await app.CreateRecipeAsync(content: true);
        var id = recipe.GetProperty("id").GetGuid();
        var step = recipe.GetProperty("steps")[0].GetProperty("id").GetGuid();
        var client = role == "guest" ? app.Guest : app.Other;
        var path = $"/api/v1/recipes/{id}/steps" + (method == "POST" ? "" : $"/{step}");
        var request = new HttpRequestMessage(new HttpMethod(method), path)
        { Content = method == "DELETE" ? null : JsonContent.Create(new { title = "Bị cấm", description = "Không lưu" }) };
        Assert.Equal(status, (int)(await client.SendAsync(request)).StatusCode);
        var steps = await ApiFixture.DataAsync(await app.Owner.GetAsync($"/api/v1/recipes/{id}/steps"));
        Assert.Single(steps.EnumerateArray());
        Assert.Equal("Nấu", steps[0].GetProperty("title").GetString());
    }

    [Theory]
    [InlineData("steps")] [InlineData("ingredients")]
    public async Task Private_children_are_visible_only_to_owner_or_admin(string child)
    {
        var recipe = await app.CreateRecipeAsync(content: true);
        var path = $"/api/v1/recipes/{recipe.GetProperty("id")}/{child}";
        Assert.Equal(HttpStatusCode.NotFound, (await app.Guest.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await app.Other.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await app.Owner.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await app.Admin.GetAsync(path)).StatusCode);
        (await app.Owner.PatchAsync($"/api/v1/recipes/{recipe.GetProperty("id")}/publish", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await app.Guest.GetAsync(path)).StatusCode);
        (await app.Owner.PatchAsync($"/api/v1/recipes/{recipe.GetProperty("id")}/archive", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await app.Guest.GetAsync(path)).StatusCode);
    }

    [Fact]
    public async Task Editors_support_nullable_ingredients_renumber_and_parent_version()
    {
        var recipe = await app.CreateRecipeAsync(); var id = recipe.GetProperty("id").GetGuid();
        var before = await ApiFixture.DataAsync(await app.Owner.GetAsync($"/api/v1/recipes/{id}/edit"));
        var ingredient = await ApiFixture.DataAsync(await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{id}/ingredients",
            new { name = "Muối", quantity = (decimal?)null, unit = (string?)null }));
        var after = await ApiFixture.DataAsync(await app.Owner.GetAsync($"/api/v1/recipes/{id}/edit"));
        Assert.NotEqual(before.GetProperty("rowVersion").GetString(), after.GetProperty("rowVersion").GetString());
        var first = await ApiFixture.DataAsync(await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{id}/steps", new { title = "Đun", description = "Đun nước" }));
        var inserted = await ApiFixture.DataAsync(await app.Owner.PostAsJsonAsync($"/api/v1/recipes/{id}/steps", new { title = "Rửa", description = "Rửa rau", stepNumber = 1 }));
        Assert.Equal(1, inserted.GetProperty("stepNumber").GetInt32());
        (await app.Owner.PutAsJsonAsync($"/api/v1/recipes/{id}/steps/{first.GetProperty("id")}", new { title = "Đun kỹ", description = "Đun sôi", stepNumber = 1 })).EnsureSuccessStatusCode();
        var steps = await ApiFixture.DataAsync(await app.Owner.GetAsync($"/api/v1/recipes/{id}/steps"));
        Assert.Equal(new[] { 1, 2 }, steps.EnumerateArray().Select(s => s.GetProperty("stepNumber").GetInt32()));
        (await app.Owner.PutAsJsonAsync($"/api/v1/recipes/{id}/ingredients/{ingredient.GetProperty("id")}", new { name = "Muối hạt", quantity = 0.5, unit = "muỗng" })).EnsureSuccessStatusCode();
        (await app.Owner.PatchAsync($"/api/v1/recipes/{id}/publish", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NoContent, (await app.Owner.DeleteAsync($"/api/v1/recipes/{id}/steps/{inserted.GetProperty("id")}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await app.Owner.DeleteAsync($"/api/v1/recipes/{id}/ingredients/{ingredient.GetProperty("id")}")).StatusCode);
    }

    [Fact]
    public async Task Publish_requires_both_children_and_slug_survives_archive_update()
    {
        var empty = await app.CreateRecipeAsync();
        var rejected = await app.Owner.PatchAsync($"/api/v1/recipes/{empty.GetProperty("id")}/publish", null);
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        var problem = await rejected.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("RECIPE_PUBLISH_INCOMPLETE", problem.GetProperty("errorCode").GetString());
        var recipe = await app.CreateRecipeAsync(content: true); var id = recipe.GetProperty("id").GetGuid();
        (await app.Owner.PatchAsync($"/api/v1/recipes/{id}/publish", null)).EnsureSuccessStatusCode();
        (await app.Owner.PatchAsync($"/api/v1/recipes/{id}/unpublish", null)).EnsureSuccessStatusCode();
        (await app.Owner.PatchAsync($"/api/v1/recipes/{id}/archive", null)).EnsureSuccessStatusCode();
        var edit = await ApiFixture.DataAsync(await app.Owner.GetAsync($"/api/v1/recipes/{id}/edit"));
        var update = new { title = "Tên mới " + Guid.NewGuid(), description = "Mô tả mới", instructions = "Nấu kỹ", categoryId = app.CategoryId,
            prepTime = 5, cookTime = 0, servings = 2, difficulty = "Medium", rowVersion = edit.GetProperty("rowVersion").GetString() };
        var saved = await ApiFixture.DataAsync(await app.Owner.PutAsJsonAsync($"/api/v1/recipes/{id}", update));
        Assert.Equal(recipe.GetProperty("slug").GetString(), saved.GetProperty("slug").GetString());
        var conflict = await app.Owner.PutAsJsonAsync($"/api/v1/recipes/{id}", update);
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        Assert.Equal("RECIPE_CONCURRENCY_CONFLICT", (await conflict.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Search_description_and_category_paging_use_database_vector()
    {
        var marker = "đặctrưng" + Guid.NewGuid().ToString("N");
        var recipe = await app.CreateRecipeAsync("Tiêu đề không chứa từ khóa " + Guid.NewGuid(), true);
        var id = recipe.GetProperty("id").GetGuid();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>();
            var row = await db.Recipes.SingleAsync(r => r.Id == id);
            row.UpdateDetails(null, marker, null, null, null, null, null, null); await db.SaveChangesAsync();
        }
        (await app.Owner.PatchAsync($"/api/v1/recipes/{id}/publish", null)).EnsureSuccessStatusCode();
        var response = await app.Guest.GetAsync($"/api/v1/recipes/search?q={Uri.EscapeDataString(marker)}&minServings=3&sort=prepTime");
        var matches = await ApiFixture.DataAsync(response);
        Assert.Single(matches.EnumerateArray()); Assert.Equal(id, matches[0].GetProperty("id").GetGuid());
        var category = await ApiFixture.DataAsync(await app.Guest.GetAsync("/api/v1/categories/mon-kiem-thu?page=1&pageSize=1&sort=-prepTime"));
        Assert.Single(category.GetProperty("recipes").EnumerateArray()); Assert.Equal(1, category.GetProperty("meta").GetProperty("pageSize").GetInt32());
        Assert.Equal(0, (await ApiFixture.DataAsync(await app.Guest.GetAsync($"/api/v1/recipes/search?q={Uri.EscapeDataString(marker)}&minServings=10"))).GetArrayLength());
    }

    [Fact]
    public async Task Soft_delete_reserves_slug_and_category_name_without_500()
    {
        var name = "Tên giữ " + Guid.NewGuid().ToString("N");
        var category = await ApiFixture.DataAsync(await app.Admin.PostAsJsonAsync("/api/v1/categories", new { name }));
        var id = category.GetProperty("id").GetGuid();
        (await app.Admin.DeleteAsync($"/api/v1/categories/{id}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await app.Admin.PostAsJsonAsync("/api/v1/categories", new { name })).StatusCode);
        var recipe = await app.CreateRecipeAsync();
        (await app.Owner.DeleteAsync($"/api/v1/recipes/{recipe.GetProperty("id")}")).EnsureSuccessStatusCode();
        var replacement = await app.CreateRecipeAsync(recipe.GetProperty("title").GetString());
        Assert.NotEqual(recipe.GetProperty("slug").GetString(), replacement.GetProperty("slug").GetString());
    }
}
