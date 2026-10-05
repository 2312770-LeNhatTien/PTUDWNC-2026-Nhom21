using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Interfaces;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Commands.PublishRecipe;

/// <summary>
/// Handler xử lý nghiệp vụ xuất bản công thức (FR-RCP-005).
/// Tuân thủ quyết định kiến trúc D11: Bắt buộc tối thiểu 1 nguyên liệu và 1 bước nấu.
/// </summary>
public class PublishRecipeCommandHandler : IRequestHandler<PublishRecipeCommand, RecipeDetailDto>
{
    private readonly IRecipeRepository _recipeRepository;
    private readonly ICurrentUser _currentUser;
    private readonly ICacheService _cacheService;

    public PublishRecipeCommandHandler(
        IRecipeRepository recipeRepository,
        ICurrentUser currentUser,
        ICacheService cacheService)
    {
        _recipeRepository = recipeRepository;
        _currentUser = currentUser;
        _cacheService = cacheService;
    }

    public async Task<RecipeDetailDto> Handle(PublishRecipeCommand request, CancellationToken ct)
    {
        // 1. Kiểm tra xác thực người dùng
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedException("Người dùng chưa đăng nhập hoặc phiên làm việc không hợp lệ.");
        }

        // 2. Tải công thức kèm danh sách Steps, Ingredients, Images, Category, Author
        var recipe = await _recipeRepository.GetDetailByIdAsync(request.Id, ct);
        if (recipe == null)
        {
            throw new NotFoundException("Công thức", request.Id);
        }

        // 3. Phân quyền: Chỉ tác giả sở hữu hoặc Admin mới có quyền xuất bản
        var isOwner = recipe.AuthorId == _currentUser.UserId;
        var isAdmin = _currentUser.IsAdmin;
        if (!isOwner && !isAdmin)
        {
            throw new ForbiddenException("Bạn không có quyền xuất bản công thức này.");
        }

        // 4. Tuân thủ Quyết định Kiến trúc D11: Kiểm tra đủ nguyên liệu và bước nấu
        if (recipe.Ingredients.Count == 0 || recipe.Steps.Count == 0)
        {
            throw new ValidationException("RECIPE_PUBLISH_INCOMPLETE", "Công thức phải có ít nhất 1 nguyên liệu và 1 bước nấu trước khi xuất bản.");
        }

        // 5. Cập nhật trạng thái sang Published và gán PublishedAt
        recipe.Publish();

        // 6. Lưu vào cơ sở dữ liệu
        await _recipeRepository.SaveChangesAsync(ct);

        // 7. Xóa cache liên quan trên Redis (nếu RedisCacheService đã được hiện thực)
        try
        {
            await _cacheService.RemoveByPrefixAsync("recipes", ct);
            await _cacheService.RemoveByPrefixAsync("categories", ct);
        }
        catch (NotImplementedException)
        {
            // Bỏ qua nếu RedisCacheService chưa được bạn Toàn hiện thực
        }

        // 8. Trả về DTO chi tiết công thức sau khi xuất bản
        return MapToDetailDto(recipe);
    }

    private static RecipeDetailDto MapToDetailDto(Recipe recipe)
    {
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
                recipe.Category?.Name ?? string.Empty,
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
