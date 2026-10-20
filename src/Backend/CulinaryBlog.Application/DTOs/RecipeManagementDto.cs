using CulinaryBlog.Domain.Entities;

namespace CulinaryBlog.Application.DTOs;

public record MyRecipeDto(Guid Id, string Title, string Slug, string Status,
    string? PrimaryImageUrl, string CategoryName, DateTime CreatedAt, DateTime? UpdatedAt);

public record RecipeEditDto(RecipeDetailDto Recipe, byte[] RowVersion,
    DateTime CreatedAt, DateTime? UpdatedAt);

public static class RecipeManagementMapping
{
    public static RecipeEditDto ToEditDto(Recipe r) => new(
        new RecipeDetailDto(r.Id, r.Title, r.Slug, r.Description, r.Instructions,
            r.PrepTime, r.CookTime, r.Servings, r.Difficulty.ToString(), r.Status.ToString(), r.PublishedAt,
            new(r.CategoryId, r.Category?.Name ?? "", r.Category?.Slug ?? ""),
            new(r.AuthorId, r.Author?.DisplayName ?? "", r.Author?.AvatarUrl),
            r.Nutrition is { } n ? new(n.Calories, n.Protein, n.Carbohydrates, n.Fat, n.Fiber, n.Sodium) : null,
            r.Steps.OrderBy(s => s.StepNumber).Select(s => new RecipeStepDto(s.Id, s.StepNumber, s.Title, s.Description, s.TimerMinutes, s.ImageUrl)).ToList(),
            r.Ingredients.OrderBy(i => i.OrderIndex).Select(i => new RecipeIngredientDto(i.Id, i.Name, i.Quantity, i.Unit, i.Notes, i.OrderIndex)).ToList(),
            r.Images.OrderBy(i => i.OrderIndex).Select(i => new RecipeImageDto(i.Id, i.OriginalUrl, i.MediumUrl, i.ThumbnailUrl, i.AltText, i.IsPrimary, i.OrderIndex)).ToList()),
        r.RowVersion ?? throw new InvalidOperationException("Recipe version is missing. Apply database migrations."),
        r.CreatedAt, r.UpdatedAt);
}
