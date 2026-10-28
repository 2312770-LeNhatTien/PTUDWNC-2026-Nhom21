// ============================================================================
// CHỨC NĂNG: FR-RCP-010 - Quản lý các bước nấu (Thêm bước thực hiện mới)
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// QUYẾT ĐỊNH KIẾN TRÚC TUÂN THỦ: D9 (RecipeStep: StepNumber tự sinh và Title bắt buộc)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageSteps;

/// <summary>
/// DTO lệnh gửi từ Client để thêm bước nấu vào công thức.
/// Tuân thủ quyết định D9: StepNumber là tùy chọn (nullable).
/// Nếu client không truyền, server tự động tính toán gán Max + 1.
/// </summary>
public record AddRecipeStepCommand(
    Guid RecipeId,
    string Title,
    string Description,
    int? StepNumber = null,
    int? TimerMinutes = null,
    string? ImageUrl = null
) : IRequest<RecipeStepDto>;

/// <summary>
/// Bộ kiểm tra tính hợp lệ dữ liệu đầu vào sử dụng FluentValidation.
/// Tự động chạy thông qua ValidationBehavior trong MediatR Pipeline trước khi vào Handler.
/// </summary>
public class AddRecipeStepCommandValidator : AbstractValidator<AddRecipeStepCommand>
{
    public AddRecipeStepCommandValidator()
    {
        // 1. Kiểm tra ID công thức không được để trống (phải là GUID hợp lệ)
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        // 2. Tuân thủ Quyết định D9: Tiêu đề bước là bắt buộc và tối đa 200 ký tự
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Tiêu đề bước nấu không được để trống.")
            .MaximumLength(200).WithMessage("Tiêu đề bước nấu không vượt quá 200 ký tự.");

        // 3. Nội dung mô tả chi tiết của bước thực hiện là bắt buộc
        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Mô tả bước nấu không được để trống.");

        // 4. Nếu client truyền StepNumber thì giá trị phải lớn hơn 0 (theo Check Constraint DB)
        When(x => x.StepNumber.HasValue, () =>
        {
            RuleFor(x => x.StepNumber!.Value)
                .GreaterThan(0).WithMessage("Số thứ tự bước phải lớn hơn 0.");
        });

        // 5. Nếu có hẹn giờ (TimerMinutes), số phút không được là số âm
        When(x => x.TimerMinutes.HasValue, () =>
        {
            RuleFor(x => x.TimerMinutes!.Value)
                .GreaterThanOrEqualTo(0).WithMessage("Thời gian hẹn giờ không được âm.");
        });
    }
}

/// <summary>
/// Handler xử lý nghiệp vụ thêm bước nấu vào công thức theo mô hình CQRS.
/// </summary>
public class AddRecipeStepCommandHandler : IRequestHandler<AddRecipeStepCommand, RecipeStepDto>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IFileStorageService _files;

    public AddRecipeStepCommandHandler(
        IApplicationDbContext dbContext,
        ICurrentUser currentUser, IFileStorageService files)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _files = files;
    }

    public async Task<RecipeStepDto> Handle(AddRecipeStepCommand request, CancellationToken cancellationToken)
    {
        // Handler cũng kiểm tra xác thực khi được gọi trực tiếp ngoài HTTP.
        if (!_currentUser.IsAuthenticated)
            throw new UnauthorizedException("Vui lòng đăng nhập.");

        // 1. Tải công thức kèm danh sách toàn bộ các bước hiện tại từ CSDL
        var recipe = await _dbContext.Recipes
            .Include(r => r.Steps)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, cancellationToken);

        // 2. Nếu công thức không tồn tại, trả về lỗi 404 NotFound
        if (recipe == null)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // 3. Kiểm tra quyền sở hữu: Chỉ tác giả của công thức hoặc Admin mới được phép thêm bước
        var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
        var isAdmin = _currentUser.IsAdmin;
        if (!isAuthor && !isAdmin)
        {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa bước nấu của công thức này.");
        }

        if (!string.IsNullOrWhiteSpace(request.ImageUrl))
            await _files.EnsureOwnedUploadAsync(request.ImageUrl, cancellationToken);

        // 4. Áp dụng Quyết định kiến trúc D9: Xác định số thứ tự bước (StepNumber)
        int targetStepNumber;
        var existingSteps = recipe.Steps.OrderBy(s => s.StepNumber).ToList();

        if (!request.StepNumber.HasValue)
        {
            // Trường hợp client không truyền: Tự động gán bằng Max(StepNumber) + 1 (hoặc 1 nếu danh sách đang rỗng)
            targetStepNumber = existingSteps.Count > 0 ? existingSteps.Max(s => s.StepNumber) + 1 : 1;
        }
        else
        {
            targetStepNumber = request.StepNumber.Value;
            var maxExisting = existingSteps.Count > 0 ? existingSteps.Max(s => s.StepNumber) : 0;

            if (targetStepNumber > maxExisting)
            {
                // Nếu client truyền số lớn hơn max hiện tại, tự động gán nối tiếp ngay sau bước cuối cùng
                targetStepNumber = maxExisting + 1;
            }
            else
            {
                // Nếu client chèn bước vào giữa danh sách:
                // Dịch chuyển các bước có StepNumber >= targetStepNumber tăng lên 1 để nhường chỗ
                foreach (var s in existingSteps.Where(s => s.StepNumber >= targetStepNumber).OrderByDescending(s => s.StepNumber))
                {
                    s.Renumber(s.StepNumber + 1);
                }
            }
        }

        // 5. Khởi tạo thực thể RecipeStep thông qua Factory Method của Domain
        var newStep = RecipeStep.Create(
            recipeId: recipe.Id,
            stepNumber: targetStepNumber,
            title: request.Title,
            description: request.Description,
            timerMinutes: request.TimerMinutes,
            imageUrl: request.ImageUrl
        );

        // 6. Thêm vào tập hợp Steps và lưu thay đổi vào CSDL
        _dbContext.RecipeSteps.Add(newStep);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // 7. Ánh xạ sang RecipeStepDto và trả về kết quả cho Client
        return new RecipeStepDto(
            Id: newStep.Id,
            StepNumber: newStep.StepNumber,
            Title: newStep.Title,
            Description: newStep.Description,
            TimerMinutes: newStep.TimerMinutes,
            ImageUrl: newStep.ImageUrl
        );
    }
}
