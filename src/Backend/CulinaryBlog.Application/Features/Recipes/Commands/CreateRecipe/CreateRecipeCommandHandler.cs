using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.CreateRecipe;

/// <summary>
/// Handler xử lý Command tạo công thức mới (FR-RCP-003, SRS mục 3.3 và 8.3).
///
/// Các bước nghiệp vụ thực hiện:
/// 1. Xác thực tác giả hiện tại (CurrentUser.UserId) - đảm bảo người dùng đã đăng nhập và không nhận AuthorId từ client nhằm chống giả mạo.
/// 2. Kiểm tra danh mục (CategoryId) có tồn tại trong hệ thống hay không -> Ném NotFoundException nếu không tìm thấy.
/// 3. Khởi tạo đối tượng Aggregate Root Recipe ở trạng thái ban đầu là Draft.
/// 4. Đảm bảo tính duy nhất của Slug (SEO-friendly URL):
///    - Nếu Slug đã tồn tại trong CSDL, tự động nối thêm hậu tố số tăng dần ("-2", "-3",...) cho tới khi không trùng.
/// 5. Thiết lập thông tin dinh dưỡng (RecipeNutrition - Owned Entity) nếu client cung cấp.
/// 6. Thêm các nguyên liệu ban đầu (RecipeIngredient) và tự động chuẩn hóa thứ tự orderIndex.
/// 7. Thêm các bước thực hiện ban đầu (RecipeStep) và tự động đánh số thứ tự stepNumber liên tục 1, 2, 3...
/// 8. Lưu đối tượng vào CSDL thông qua IRecipeRepository (Repository pattern) và Unit of Work SaveChangesAsync.
/// 9. Đọc thông tin tác giả và ánh xạ nội dung vừa lưu sang RecipeDetailDto.
/// </summary>
public class CreateRecipeCommandHandler : IRequestHandler<CreateRecipeCommand, RecipeDetailDto>
{
    private readonly IRecipeRepository _recipeRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ICurrentUser _currentUser;
    private readonly IFileStorageService _files;
    private readonly IApplicationDbContext _context;

    public CreateRecipeCommandHandler(
        IRecipeRepository recipeRepository,
        ICategoryRepository categoryRepository,
        ICurrentUser currentUser, IFileStorageService files, IApplicationDbContext context)
    {
        _recipeRepository = recipeRepository;
        _categoryRepository = categoryRepository;
        _currentUser = currentUser;
        _files = files;
        _context = context;
    }

    public async Task<RecipeDetailDto> Handle(CreateRecipeCommand request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra xác thực tác giả
        var authorId = _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(authorId))
        {
            throw new UnauthorizedException("Người dùng chưa đăng nhập hoặc phiên đăng nhập không hợp lệ.");
        }

        // 2. Kiểm tra danh mục có tồn tại hay không
        var category = await _categoryRepository.GetByIdAsync(request.CategoryId, cancellationToken);
        if (category == null)
        {
            throw new NotFoundException("Danh mục", request.CategoryId);
        }

        // 3. Khởi tạo Entity Recipe (mặc định trạng thái Draft, chưa Publish)
        var recipe = Recipe.Create(
            title: request.Title,
            description: request.Description,
            instructions: request.Instructions,
            categoryId: request.CategoryId,
            authorId: authorId,
            prepTime: request.PrepTime,
            cookTime: request.CookTime,
            servings: request.Servings,
            difficulty: request.Difficulty
        );

        // 4. Đảm bảo tính duy nhất của Slug
        var baseSlug = recipe.Slug;
        var uniqueSlug = baseSlug;
        var suffix = 2;

        while (await _recipeRepository.SlugExistsAsync(uniqueSlug, cancellationToken))
        {
            uniqueSlug = $"{baseSlug}-{suffix}";
            suffix++;
        }

        if (uniqueSlug != baseSlug)
        {
            recipe.SetSlug(uniqueSlug);
        }

        // 5. Thiết lập thông tin dinh dưỡng (nếu có)
        if (request.Nutrition != null)
        {
            var nutrition = new RecipeNutrition(
                request.Nutrition.Calories,
                request.Nutrition.Protein,
                request.Nutrition.Carbohydrates,
                request.Nutrition.Fat,
                request.Nutrition.Fiber,
                request.Nutrition.Sodium
            );
            recipe.SetNutrition(nutrition);
        }

        // 6. Thêm danh sách nguyên liệu nếu client gửi kèm
        if (request.Ingredients != null && request.Ingredients.Count > 0)
        {
            var currentOrder = 1;
            foreach (var ingDto in request.Ingredients)
            {
                var order = ingDto.OrderIndex > 0 ? ingDto.OrderIndex : currentOrder;
                var ingredient = RecipeIngredient.Create(
                    recipeId: recipe.Id,
                    name: ingDto.Name,
                    quantity: ingDto.Quantity,
                    unit: ingDto.Unit,
                    notes: ingDto.Notes,
                    orderIndex: order
                );
                recipe.Ingredients.Add(ingredient);
                currentOrder++;
            }
        }

        // 7. Thêm danh sách các bước thực hiện nếu client gửi kèm
        if (request.Steps != null && request.Steps.Count > 0)
        {
            var currentStepNum = 1;
            foreach (var stepDto in request.Steps)
            {
                if (!string.IsNullOrWhiteSpace(stepDto.ImageUrl))
                    await _files.EnsureOwnedUploadAsync(stepDto.ImageUrl, cancellationToken);
                var stepNum = stepDto.StepNumber.HasValue && stepDto.StepNumber.Value > 0
                    ? stepDto.StepNumber.Value
                    : currentStepNum;

                var step = RecipeStep.Create(
                    recipeId: recipe.Id,
                    stepNumber: stepNum,
                    title: stepDto.Title,
                    description: stepDto.Description,
                    timerMinutes: stepDto.TimerMinutes,
                    imageUrl: stepDto.ImageUrl
                );
                recipe.Steps.Add(step);
                currentStepNum = stepNum + 1;
            }
        }

        // 8. Lưu vào cơ sở dữ liệu
        await _recipeRepository.AddAsync(recipe, cancellationToken);
        await _recipeRepository.SaveChangesAsync(cancellationToken);

        // Nội dung con vừa tạo đã có trong bộ nhớ; không SELECT lại cả aggregate bằng nhiều query.
        var savedRecipe = recipe;
        var author = await _context.Users.AsNoTracking().Where(u => u.Id == authorId)
            .Select(u => new AuthorRefDto(u.Id, u.DisplayName, u.AvatarUrl)).SingleAsync(cancellationToken);

        return new RecipeDetailDto(
            savedRecipe.Id,
            savedRecipe.Title,
            savedRecipe.Slug,
            savedRecipe.Description,
            savedRecipe.Instructions,
            savedRecipe.PrepTime,
            savedRecipe.CookTime,
            savedRecipe.Servings,
            savedRecipe.Difficulty.ToString(),
            savedRecipe.Status.ToString(),
            savedRecipe.PublishedAt,
            new CategoryRefDto(
                savedRecipe.Category?.Id ?? category.Id,
                savedRecipe.Category?.Name ?? category.Name,
                savedRecipe.Category?.Slug ?? category.Slug
            ),
            author,
            savedRecipe.Nutrition != null ? new NutritionDto(
                savedRecipe.Nutrition.Calories,
                savedRecipe.Nutrition.Protein,
                savedRecipe.Nutrition.Carbohydrates,
                savedRecipe.Nutrition.Fat,
                savedRecipe.Nutrition.Fiber,
                savedRecipe.Nutrition.Sodium
            ) : null,
            savedRecipe.Steps.OrderBy(s => s.StepNumber).Select(s => new RecipeStepDto(
                s.Id,
                s.StepNumber,
                s.Title,
                s.Description,
                s.TimerMinutes,
                s.ImageUrl
            )).ToList(),
            savedRecipe.Ingredients.OrderBy(i => i.OrderIndex).Select(i => new RecipeIngredientDto(
                i.Id,
                i.Name,
                i.Quantity,
                i.Unit,
                i.Notes,
                i.OrderIndex
            )).ToList(),
            savedRecipe.Images.OrderBy(i => i.OrderIndex).Select(i => new RecipeImageDto(
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

