// ============================================================================
// CHỨC NĂNG: FR-RCP-009 - Quản lý nguyên liệu (Cập nhật nguyên liệu trong công thức)
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// QUYẾT ĐỊNH KIẾN TRÚC TUÂN THỦ: D10 (Quantity và Unit nullable cho nguyên liệu "vừa đủ")
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageIngredients;

/// <summary>
/// DTO lệnh gửi từ Client để chỉnh sửa thông tin một nguyên liệu đã có trong công thức.
/// </summary>
public record UpdateRecipeIngredientCommand(
    Guid RecipeId,
    Guid IngredientId,
    string Name,
    decimal? Quantity = null,
    string? Unit = null,
    string? Notes = null,
    int? OrderIndex = null
) : IRequest<RecipeIngredientDto>;

/// <summary>
/// Validator kiểm tra tính hợp lệ của dữ liệu cập nhật nguyên liệu.
/// </summary>
public class UpdateRecipeIngredientCommandValidator : AbstractValidator<UpdateRecipeIngredientCommand>
{
    public UpdateRecipeIngredientCommandValidator()
    {
        // 1. Kiểm tra ID công thức và ID nguyên liệu
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        RuleFor(x => x.IngredientId)
            .NotEmpty().WithMessage("ID nguyên liệu không được để trống.");

        // 2. Tên nguyên liệu là bắt buộc (D10)
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên nguyên liệu không được để trống.")
            .MaximumLength(100).WithMessage("Tên nguyên liệu không được vượt quá 100 ký tự.");

        // 3. Định lượng (Quantity) nếu có thì phải lớn hơn 0 (D10: cho phép null)
        When(x => x.Quantity.HasValue, () =>
        {
            RuleFor(x => x.Quantity!.Value)
                .GreaterThan(0).WithMessage("Định lượng nguyên liệu phải lớn hơn 0.");
        });

        // 4. Đơn vị đo lường nếu có không vượt quá 50 ký tự (D10: cho phép null)
        When(x => !string.IsNullOrWhiteSpace(x.Unit), () =>
        {
            RuleFor(x => x.Unit)
                .MaximumLength(50).WithMessage("Đơn vị đo không được vượt quá 50 ký tự.");
        });

        // 5. Ghi chú nếu có không vượt quá 500 ký tự
        When(x => !string.IsNullOrWhiteSpace(x.Notes), () =>
        {
            RuleFor(x => x.Notes)
                .MaximumLength(500).WithMessage("Ghi chú nguyên liệu không được vượt quá 500 ký tự.");
        });
    }
}

/// <summary>
/// Handler xử lý nghiệp vụ cập nhật nguyên liệu món ăn theo CQRS.
/// </summary>
public class UpdateRecipeIngredientCommandHandler : IRequestHandler<UpdateRecipeIngredientCommand, RecipeIngredientDto>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public UpdateRecipeIngredientCommandHandler(
        IApplicationDbContext dbContext,
        ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<RecipeIngredientDto> Handle(UpdateRecipeIngredientCommand request, CancellationToken ct)
    {
        // 1. Tìm công thức kèm danh sách nguyên liệu
        var recipe = await _dbContext.Recipes
            .Include(r => r.Ingredients)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, ct);

        if (recipe == null)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // 2. Kiểm tra phân quyền: Chỉ tác giả công thức hoặc Admin mới có quyền sửa
        if (_currentUser.IsAuthenticated)
        {
            var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
            var isAdmin = _currentUser.IsAdmin;
            if (!isAuthor && !isAdmin)
            {
                throw new ForbiddenException("Bạn không có quyền chỉnh sửa nguyên liệu của công thức này.");
            }
        }

        // 3. Tìm nguyên liệu cần chỉnh sửa
        var ingredient = recipe.Ingredients.FirstOrDefault(i => i.Id == request.IngredientId);
        if (ingredient == null)
        {
            throw new NotFoundException("Nguyên liệu", request.IngredientId);
        }

        // 4. Xử lý thay đổi thứ tự (OrderIndex) nếu có
        if (request.OrderIndex.HasValue && request.OrderIndex.Value != ingredient.OrderIndex)
        {
            var newPos = request.OrderIndex.Value;
            var allItems = recipe.Ingredients.OrderBy(i => i.OrderIndex).ToList();

            allItems.Remove(ingredient);
            if (newPos < 1) newPos = 1;
            if (newPos > allItems.Count + 1) newPos = allItems.Count + 1;

            allItems.Insert(newPos - 1, ingredient);

            for (int i = 0; i < allItems.Count; i++)
            {
                allItems[i].Renumber(i + 1);
            }
        }

        // 5. Cập nhật thông tin chi tiết (Tuân thủ D10: cho phép Quantity và Unit null)
        ingredient.Update(
            name: request.Name.Trim(),
            quantity: request.Quantity,
            unit: string.IsNullOrWhiteSpace(request.Unit) ? null : request.Unit.Trim(),
            notes: string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            orderIndex: null // Đã renumber ở trên nếu có đổi
        );

        // 6. Lưu vào cơ sở dữ liệu
        await _dbContext.SaveChangesAsync(ct);

        // 7. Trả về DTO kết quả
        return new RecipeIngredientDto(
            Id: ingredient.Id,
            Name: ingredient.Name,
            Quantity: ingredient.Quantity,
            Unit: ingredient.Unit,
            Notes: ingredient.Notes,
            OrderIndex: ingredient.OrderIndex
        );
    }
}
