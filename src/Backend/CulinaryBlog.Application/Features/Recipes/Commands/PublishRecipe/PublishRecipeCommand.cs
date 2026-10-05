using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Commands.PublishRecipe;

/// <summary>
/// Command xuất bản công thức (FR-RCP-005).
/// Yêu cầu kiểm tra điều kiện kiến trúc D11: tối thiểu 1 nguyên liệu và 1 bước thực hiện.
/// </summary>
public record PublishRecipeCommand(Guid Id) : IRequest<RecipeDetailDto>;
