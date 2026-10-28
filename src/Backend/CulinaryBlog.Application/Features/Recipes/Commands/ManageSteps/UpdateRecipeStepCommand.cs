// ============================================================================
// CHỨC NĂNG: FR-RCP-010 - Quản lý các bước nấu (Cập nhật bước thực hiện)
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// QUYẾT ĐỊNH KIẾN TRÚC TUÂN THỦ: D9 (Title bắt buộc, cập nhật thứ tự nếu đổi StepNumber)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageSteps;

/// <summary>
/// DTO lệnh gửi từ Client để chỉnh sửa thông tin một bước nấu đã có.
/// </summary>
public record UpdateRecipeStepCommand(
    Guid RecipeId,
    Guid StepId,
    string Title,
    string Description,
    int? StepNumber = null,
    int? TimerMinutes = null,
    string? ImageUrl = null
) : IRequest<RecipeStepDto>;

/// <summary>
/// Validator kiểm tra tính toàn vẹn của dữ liệu cập nhật bước nấu.
/// </summary>
public class UpdateRecipeStepCommandValidator : AbstractValidator<UpdateRecipeStepCommand>
{
    public UpdateRecipeStepCommandValidator()
    {
        // 1. Kiểm tra ID công thức và ID bước nấu
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        RuleFor(x => x.StepId)
            .NotEmpty().WithMessage("ID bước nấu không được để trống.");

        // 2. Tiêu đề bước là bắt buộc (D9)
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Tiêu đề bước nấu không được để trống.")
            .MaximumLength(200).WithMessage("Tiêu đề bước nấu không vượt quá 200 ký tự.");

        // 3. Nội dung mô tả chi tiết là bắt buộc
        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Mô tả bước nấu không được để trống.");

        // 4. Nếu có truyền số thứ tự mới, phải lớn hơn 0
        When(x => x.StepNumber.HasValue, () =>
        {
            RuleFor(x => x.StepNumber!.Value)
                .GreaterThan(0).WithMessage("Số thứ tự bước phải lớn hơn 0.");
        });

        // 5. Thời gian hẹn giờ nếu có không được âm
        When(x => x.TimerMinutes.HasValue, () =>
        {
            RuleFor(x => x.TimerMinutes!.Value)
                .GreaterThanOrEqualTo(0).WithMessage("Thời gian hẹn giờ không được âm.");
        });
    }
}

/// <summary>
/// Handler xử lý nghiệp vụ cập nhật bước nấu theo CQRS.
/// </summary>
public class UpdateRecipeStepCommandHandler : IRequestHandler<UpdateRecipeStepCommand, RecipeStepDto>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IFileStorageService _files;

    public UpdateRecipeStepCommandHandler(
        IApplicationDbContext dbContext,
        ICurrentUser currentUser, IFileStorageService files)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _files = files;
    }

    public async Task<RecipeStepDto> Handle(UpdateRecipeStepCommand request, CancellationToken cancellationToken)
    {
        // Handler cũng kiểm tra xác thực khi được gọi trực tiếp ngoài HTTP.
        if (!_currentUser.IsAuthenticated)
            throw new UnauthorizedException("Vui lòng đăng nhập.");

        // 1. Tìm công thức kèm danh sách toàn bộ các bước để kiểm tra quyền và cấu trúc thứ tự
        var recipe = await _dbContext.Recipes
            .Include(r => r.Steps)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, cancellationToken);

        if (recipe == null)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // 2. Kiểm tra phân quyền: Chỉ tác giả của công thức hoặc Admin mới có quyền sửa
        var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
        var isAdmin = _currentUser.IsAdmin;
        if (!isAuthor && !isAdmin)
        {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa bước nấu của công thức này.");
        }

        // 3. Tìm bước nấu cần chỉnh sửa trong danh sách Steps của công thức
        var step = recipe.Steps.FirstOrDefault(s => s.Id == request.StepId);
        if (step == null)
        {
            throw new NotFoundException("Bước nấu", request.StepId);
        }

        if (!string.IsNullOrWhiteSpace(request.ImageUrl) && request.ImageUrl != step.ImageUrl)
            await _files.EnsureOwnedUploadAsync(request.ImageUrl, cancellationToken);

        // 4. Xử lý trường hợp người dùng muốn thay đổi số thứ tự (StepNumber) của bước
        // Các pha offset/renumber cùng transaction để lỗi giữa chừng không lưu số tạm.
        await _dbContext.ExecuteInTransactionAsync(async () =>
        {
            if (request.StepNumber.HasValue && request.StepNumber.Value != step.StepNumber)
            {
                var newPos = request.StepNumber.Value;
                var allSteps = recipe.Steps.OrderBy(s => s.StepNumber).ToList();

                // Rút bước hiện tại ra khỏi danh sách
                allSteps.Remove(step);

                // Giới hạn vị trí mới trong khoảng hợp lệ [1, allSteps.Count + 1]
                if (newPos < 1) newPos = 1;
                if (newPos > allSteps.Count + 1) newPos = allSteps.Count + 1;

                // Chèn bước vào vị trí mong muốn mới
                allSteps.Insert(newPos - 1, step);

                // Giai đoạn 1: Gán số thứ tự tạm thời (offset 10000) để phá vỡ vòng lặp phụ thuộc (circular dependency)
                // trên Unique Composite Index { RecipeId, StepNumber } của Entity Framework Core
                for (int i = 0; i < allSteps.Count; i++)
                {
                    allSteps[i].Renumber(10000 + (i + 1));
                }
                await _dbContext.SaveChangesAsync(cancellationToken);

                // Giai đoạn 2: Đánh lại số thứ tự chuẩn tuần tự (1, 2, 3...) cho toàn bộ danh sách
                for (int i = 0; i < allSteps.Count; i++)
                {
                    allSteps[i].Renumber(i + 1);
                }
            }

            // 5. Cập nhật các trường thông tin nội dung của bước nấu (Title, Description, Timer, Image)
            step.Update(
                stepNumber: null, // Đã xử lý renumber ở trên nếu có đổi
                title: request.Title,
                description: request.Description,
                timerMinutes: request.TimerMinutes,
                imageUrl: request.ImageUrl
            );

            // 6. Lưu vào cơ sở dữ liệu
            await _dbContext.SaveChangesAsync(cancellationToken);

            // 7. Trả về DTO kết quả
        }, cancellationToken);
        return new RecipeStepDto(
            Id: step.Id,
            StepNumber: step.StepNumber,
            Title: step.Title,
            Description: step.Description,
            TimerMinutes: step.TimerMinutes,
            ImageUrl: step.ImageUrl
        );
    }
}
