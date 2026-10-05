using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Commands.PublishRecipe;

/// <summary>
/// Command hủy xuất bản công thức, chuyển trạng thái về Draft (FR-RCP-005).
/// </summary>
public record UnpublishRecipeCommand(Guid Id) : IRequest<RecipeDetailDto>;
