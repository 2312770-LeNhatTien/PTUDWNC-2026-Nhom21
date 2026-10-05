using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Interfaces;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeBySlug;

/// <summary>
/// Handler xử lý truy vấn xem chi tiết công thức nấu ăn theo Slug (FR-RCP-002, SRS mục 3.3 và 8.3).
///
/// Các bước thực hiện:
/// 1. Tìm Recipe theo Slug thông qua IRecipeRepository.GetDetailBySlugAsync (kèm Category, Author, Steps, Ingredients, Images).
/// 2. Nếu không tìm thấy hoặc đã bị xóa mềm (IsDeleted) -> Ném NotFoundException.
/// 3. Nếu công thức chưa xuất bản (Status != RecipeStatus.Published):
///    - Chỉ chủ sở hữu (AuthorId == CurrentUser.UserId) hoặc Admin mới được phép xem bản nháp/lưu trữ.
///    - Nếu không thỏa mãn -> Ném ForbiddenException.
/// 4. Ánh xạ sang RecipeDetailDto đầy đủ thông tin dinh dưỡng, checklist nguyên liệu, các bước nấu và thư viện ảnh.
/// </summary>
public class GetRecipeBySlugQueryHandler : IRequestHandler<GetRecipeBySlugQuery, RecipeDetailDto>
{
    private readonly IRecipeRepository _recipeRepository;
    private readonly ICurrentUser _currentUser;

    public GetRecipeBySlugQueryHandler(
        IRecipeRepository recipeRepository,
        ICurrentUser currentUser)
    {
        _recipeRepository = recipeRepository;
        _currentUser = currentUser;
    }

    public async Task<RecipeDetailDto> Handle(GetRecipeBySlugQuery request, CancellationToken ct)
    {
        var recipe = await _recipeRepository.GetDetailBySlugAsync(request.Slug, ct);

        if (recipe == null || recipe.IsDeleted)
        {
            throw new NotFoundException("Công thức", request.Slug);
        }

        // Kiểm tra quyền xem nếu công thức chưa được Publish
        if (recipe.Status != RecipeStatus.Published)
        {
            var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
            var isAdmin = _currentUser.IsAdmin;

            if (!isAuthor && !isAdmin)
            {
                throw new ForbiddenException("Công thức đang ở trạng thái bản nháp hoặc đã lưu trữ. Bạn không có quyền xem.");
            }
        }

        return new RecipeDetailDto(
            recipe.Id,
            recipe.Title,
            recipe.Slug,
            recipe.Description,
            recipe.Instructions,
            recipe.PrepTime,
            recipe.CookTime,
            recipe.Servings,
            recipe.Difficulty.ToString(),
            recipe.Status.ToString(),
            recipe.PublishedAt,
            new CategoryRefDto(
                recipe.Category?.Id ?? recipe.CategoryId,
                recipe.Category?.Name ?? "Không phân loại",
                recipe.Category?.Slug ?? string.Empty
            ),
            new AuthorRefDto(
                recipe.Author?.Id ?? recipe.AuthorId,
                recipe.Author?.DisplayName ?? "Tác giả",
                recipe.Author?.AvatarUrl
            ),
            recipe.Nutrition != null ? new NutritionDto(
                recipe.Nutrition.Calories,
                recipe.Nutrition.Protein,
                recipe.Nutrition.Carbohydrates,
                recipe.Nutrition.Fat,
                recipe.Nutrition.Fiber,
                recipe.Nutrition.Sodium
            ) : null,
            recipe.Steps.OrderBy(s => s.StepNumber).Select(s => new RecipeStepDto(
                s.Id,
                s.StepNumber,
                s.Title,
                s.Description,
                s.TimerMinutes,
                s.ImageUrl
            )).ToList(),
            recipe.Ingredients.OrderBy(i => i.OrderIndex).Select(i => new RecipeIngredientDto(
                i.Id,
                i.Name,
                i.Quantity,
                i.Unit,
                i.Notes,
                i.OrderIndex
            )).ToList(),
            recipe.Images.OrderBy(i => i.OrderIndex).Select(i => new RecipeImageDto(
                i.Id,
                i.OriginalUrl,
                i.MediumUrl,
                i.ThumbnailUrl,
                i.AltText,
                i.IsPrimary,
                i.OrderIndex
            )).ToList()
        );
    }
}
