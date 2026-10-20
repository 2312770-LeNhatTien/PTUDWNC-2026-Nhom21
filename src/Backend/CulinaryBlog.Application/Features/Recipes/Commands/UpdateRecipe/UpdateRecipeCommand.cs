// ============================================================================
// CHỨC NĂNG: FR-RCP-004 - Cập nhật công thức nấu ăn kèm Optimistic Concurrency
// THÀNH VIÊN: Lê Nhật Tiến (MSSV: 2312770)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Application.Features.Recipes.Common;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.ValueObjects;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.UpdateRecipe;

public record UpdateRecipeCommand(
    Guid Id,
    string Title,
    string Description,
    string? Instructions,
    Guid CategoryId,
    int PrepTime,
    int CookTime,
    int Servings,
    RecipeDifficulty Difficulty,
    NutritionDto? Nutrition = null,
    byte[]? RowVersion = null) : IRequest<RecipeDetailDto>;

public class UpdateRecipeCommandValidator : AbstractValidator<UpdateRecipeCommand>
{
    public UpdateRecipeCommandValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("Thiếu phiên bản dữ liệu. Vui lòng tải lại công thức.")
            .Must(v => v is { Length: 16 }).WithMessage("Phiên bản dữ liệu không hợp lệ.");
        RuleFor(x => x.Id)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Tiêu đề không được để trống.")
            .MaximumLength(200).WithMessage("Tiêu đề tối đa 200 ký tự.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Mô tả không được để trống.")
            .MaximumLength(2000);

        RuleFor(x => x.CategoryId)
            .NotEmpty().WithMessage("Danh mục không được để trống.");

        RuleFor(x => x.PrepTime)
            .GreaterThan(0).WithMessage("Thời gian chuẩn bị phải lớn hơn 0 phút.");

        RuleFor(x => x.CookTime)
            .GreaterThanOrEqualTo(0).WithMessage("Thời gian nấu không được âm.");

        RuleFor(x => x.Servings)
            .GreaterThan(0).WithMessage("Khẩu phần phải lớn hơn 0.");

        RuleFor(x => x.Difficulty)
            .IsInEnum().WithMessage("Độ khó không hợp lệ.");
    }
}

public class UpdateRecipeCommandHandler : IRequestHandler<UpdateRecipeCommand, RecipeDetailDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public UpdateRecipeCommandHandler(
        IApplicationDbContext context,
        ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<RecipeDetailDto> Handle(UpdateRecipeCommand request, CancellationToken ct)
    {
        // 1. Nạp Recipe kèm toàn bộ quan hệ
        var recipe = await _context.Recipes
            .Include(r => r.Category)
            .Include(r => r.Author)
            .Include(r => r.Steps)
            .Include(r => r.Ingredients)
            .Include(r => r.Images)
            .FirstOrDefaultAsync(r => r.Id == request.Id, ct);

        if (recipe == null || recipe.IsDeleted)
        {
            throw new NotFoundException("Công thức", request.Id);
        }

        // 2. Kiểm tra phân quyền: Tác giả hoặc Admin
        var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
        var isAdmin = _currentUser.IsAdmin;
        if (!isAuthor && !isAdmin)
        {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa công thức này.");
        }

        // 3. Kiểm tra danh mục mới có tồn tại không nếu có thay đổi CategoryId
        if (request.CategoryId != recipe.CategoryId)
        {
            var categoryExists = await _context.Categories
                .AnyAsync(c => c.Id == request.CategoryId && !c.IsDeleted, ct);
            if (!categoryExists)
            {
                throw new NotFoundException("Danh mục", request.CategoryId);
            }
        }

        // 4. RowVersion bắt buộc: kiểm tra phiên bản client trước khi sửa.
        if (request.RowVersion == null || recipe.RowVersion == null || !request.RowVersion.SequenceEqual(recipe.RowVersion))
        {
            throw new ConflictException("Dữ liệu công thức đã bị thay đổi bởi phiên làm việc khác. Vui lòng tải lại trang và thực hiện lại.", "RECIPE_CONCURRENCY_CONFLICT");
        }

        // 5. Cập nhật chi tiết qua domain method (tuân thủ quy tắc giữ nguyên Slug nếu đã Published)
        var oldSlug = recipe.Slug;
        recipe.UpdateDetails(
            title: request.Title,
            description: request.Description,
            instructions: request.Instructions,
            categoryId: request.CategoryId,
            prepTime: request.PrepTime,
            cookTime: request.CookTime,
            servings: request.Servings,
            difficulty: request.Difficulty
        );

        // Nếu công thức chưa Published và slug bị đổi do đổi tiêu đề, xử lý tính duy nhất của slug
        if (recipe.Status != RecipeStatus.Published && recipe.Slug != oldSlug)
        {
            var baseSlug = recipe.Slug;
            var uniqueSlug = baseSlug;
            var counter = 2;
            while (await _context.Recipes.AnyAsync(r => r.Slug == uniqueSlug && r.Id != recipe.Id && !r.IsDeleted, ct))
            {
                uniqueSlug = $"{baseSlug}-{counter}";
                counter++;
            }
            if (uniqueSlug != baseSlug)
            {
                recipe.SetSlug(uniqueSlug);
            }
        }

        // 6. Cập nhật Nutrition
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
        else
        {
            recipe.SetNutrition(null);
        }

        // 7. Lưu thay đổi và bắt ngoại lệ Concurrency
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Dữ liệu công thức đã bị thay đổi bởi phiên làm việc khác. Vui lòng tải lại trang và thực hiện lại.", "RECIPE_CONCURRENCY_CONFLICT");
        }

        // Reload without tracking: PostgreSQL generates the version and timestamps.
        var saved = await RecipeManagementQueries.Detail(_context)
            .FirstAsync(r => r.Id == recipe.Id, ct);
        var result = RecipeManagementMapping.ToEditDto(saved);
        // Preserve the existing flat recipe response; version/audit fields are additive.
        return result.Recipe with { RowVersion = result.RowVersion, CreatedAt = result.CreatedAt, UpdatedAt = result.UpdatedAt };
    }
}
