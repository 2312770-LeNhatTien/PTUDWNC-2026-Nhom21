// ============================================================================
// CHỨC NĂNG: FR-RCP-009 - Quản lý nguyên liệu (Thêm nguyên liệu mới vào công thức)
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// QUYẾT ĐỊNH KIẾN TRÚC TUÂN THỦ: D10 (Quantity và Unit nullable cho nguyên liệu "vừa đủ")
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageIngredients;

/// <summary>
/// DTO lệnh gửi từ Client để thêm một nguyên liệu vào công thức món ăn.
/// Tuân thủ D10: Quantity và Unit là tùy chọn (nullable).
/// </summary>
public record AddRecipeIngredientCommand(
    Guid RecipeId,
    string Name,
    decimal? Quantity = null,
    string? Unit = null,
    string? Notes = null,
    int? OrderIndex = null
) : IRequest<RecipeIngredientDto>;

/// <summary>
/// Validator kiểm tra tính hợp lệ của dữ liệu nguyên liệu theo quy chuẩn D10.
/// </summary>
public class AddRecipeIngredientCommandValidator : AbstractValidator<AddRecipeIngredientCommand>
{
    public AddRecipeIngredientCommandValidator()
    {
        // 1. Kiểm tra ID công thức
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

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
/// Handler xử lý nghiệp vụ thêm nguyên liệu vào công thức theo mô hình CQRS.
/// </summary>
public class AddRecipeIngredientCommandHandler : IRequestHandler<AddRecipeIngredientCommand, RecipeIngredientDto>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public AddRecipeIngredientCommandHandler(
        IApplicationDbContext dbContext,
        ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<RecipeIngredientDto> Handle(AddRecipeIngredientCommand request, CancellationToken ct)
    {
        // 1. Tải công thức kèm danh sách toàn bộ các nguyên liệu hiện có từ CSDL
        var recipe = await _dbContext.Recipes
            .Include(r => r.Ingredients)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, ct);

        // 2. Nếu công thức không tồn tại, trả về lỗi 404 NotFound
        if (recipe == null)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // 3. Kiểm tra phân quyền: Chỉ tác giả công thức hoặc Admin mới có quyền thêm nguyên liệu
        if (_currentUser.IsAuthenticated)
        {
            var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
            var isAdmin = _currentUser.IsAdmin;
            if (!isAuthor && !isAdmin)
            {
                throw new ForbiddenException("Bạn không có quyền thêm nguyên liệu cho công thức này.");
            }
        }

        // 4. Tính toán số thứ tự hiển thị (OrderIndex)
        int targetOrderIndex;
        var existingIngredients = recipe.Ingredients.OrderBy(i => i.OrderIndex).ToList();

        if (!request.OrderIndex.HasValue || request.OrderIndex.Value <= 0)
        {
            // Mặc định: Gán số thứ tự tiếp theo Max + 1 (hoặc 1 nếu danh sách đang rỗng)
            targetOrderIndex = existingIngredients.Count > 0 ? existingIngredients.Max(i => i.OrderIndex) + 1 : 1;
        }
        else
        {
            targetOrderIndex = request.OrderIndex.Value;
            var maxExisting = existingIngredients.Count > 0 ? existingIngredients.Max(i => i.OrderIndex) : 0;

            if (targetOrderIndex > maxExisting)
            {
                targetOrderIndex = maxExisting + 1;
            }
            else
            {
                // Dịch chuyển các nguyên liệu phía sau tăng lên 1
                foreach (var item in existingIngredients.Where(i => i.OrderIndex >= targetOrderIndex).OrderByDescending(i => i.OrderIndex))
                {
                    item.Renumber(item.OrderIndex + 1);
                }
            }
        }

        // 5. Khởi tạo thực thể RecipeIngredient theo chuẩn D10 (Quantity và Unit có thể null)
        var newIngredient = RecipeIngredient.Create(
            recipeId: recipe.Id,
            name: request.Name.Trim(),
            quantity: request.Quantity,
            unit: string.IsNullOrWhiteSpace(request.Unit) ? null : request.Unit.Trim(),
            notes: string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            orderIndex: targetOrderIndex
        );

        // 6. Thêm vào DbSet và lưu thay đổi vào cơ sở dữ liệu
        _dbContext.RecipeIngredients.Add(newIngredient);
        await _dbContext.SaveChangesAsync(ct);

        // 7. Trả về DTO kết quả
        return new RecipeIngredientDto(
            Id: newIngredient.Id,
            Name: newIngredient.Name,
            Quantity: newIngredient.Quantity,
            Unit: newIngredient.Unit,
            Notes: newIngredient.Notes,
            OrderIndex: newIngredient.OrderIndex
        );
    }
}
