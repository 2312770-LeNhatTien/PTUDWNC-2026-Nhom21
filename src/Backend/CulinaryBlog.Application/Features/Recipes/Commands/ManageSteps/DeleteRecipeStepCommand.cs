// ============================================================================
// CHỨC NĂNG: FR-RCP-010 - Quản lý các bước nấu (Xóa bước thực hiện)
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// QUYẾT ĐỊNH KIẾN TRÚC TUÂN THỦ: D9 & SRS 7.3 (Tự động renumber liền mạch khi xóa)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.ManageSteps;

/// <summary>
/// DTO lệnh xóa một bước nấu khỏi công thức.
/// </summary>
public record DeleteRecipeStepCommand(
    Guid RecipeId,
    Guid StepId
) : IRequest<bool>;

/// <summary>
/// Validator kiểm tra ID hợp lệ trước khi thực hiện xóa.
/// </summary>
public class DeleteRecipeStepCommandValidator : AbstractValidator<DeleteRecipeStepCommand>
{
    public DeleteRecipeStepCommandValidator()
    {
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");

        RuleFor(x => x.StepId)
            .NotEmpty().WithMessage("ID bước nấu cần xóa không được để trống.");
    }
}

/// <summary>
/// Handler xử lý xóa bước nấu và tự động đánh lại số thứ tự (renumber) cho các bước còn lại.
/// </summary>
public class DeleteRecipeStepCommandHandler : IRequestHandler<DeleteRecipeStepCommand, bool>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public DeleteRecipeStepCommandHandler(
        IApplicationDbContext dbContext,
        ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(DeleteRecipeStepCommand request, CancellationToken cancellationToken)
    {
        // Handler cũng kiểm tra xác thực khi được gọi trực tiếp ngoài HTTP.
        if (!_currentUser.IsAuthenticated)
            throw new UnauthorizedException("Vui lòng đăng nhập.");

        // 1. Tải công thức kèm danh sách toàn bộ các bước nấu
        var recipe = await _dbContext.Recipes
            .Include(r => r.Steps)
            .FirstOrDefaultAsync(r => r.Id == request.RecipeId, cancellationToken);

        if (recipe == null)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // 2. Kiểm tra phân quyền: Chỉ tác giả công thức hoặc Admin mới có quyền xóa bước nấu
        var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
        var isAdmin = _currentUser.IsAdmin;
        if (!isAuthor && !isAdmin)
        {
            throw new ForbiddenException("Bạn không có quyền xóa bước nấu của công thức này.");
        }

        // 3. Tìm bước nấu cần xóa
        var stepToDelete = recipe.Steps.FirstOrDefault(s => s.Id == request.StepId);
        if (stepToDelete == null)
        {
            throw new NotFoundException("Bước nấu", request.StepId);
        }

        // 4. Xóa bước này khỏi CSDL và lưu trước để giải phóng StepNumber
        await _dbContext.ExecuteInTransactionAsync(async () =>
        {
            _dbContext.RecipeSteps.Remove(stepToDelete);
            await _dbContext.SaveChangesAsync(cancellationToken);

            // 5. Tự động đánh lại số thứ tự (Renumber contiguously 1, 2, 3...) cho các bước còn lại
            // SRS mục 7.3: Đảm bảo số thứ tự các bước luôn liên tục, không bị gián đoạn/khuyết bước
            var remainingSteps = recipe.Steps
                .Where(s => s.Id != request.StepId)
                .OrderBy(s => s.StepNumber)
                .ToList();

            if (remainingSteps.Count > 0)
            {
                // Giai đoạn 1: Gán offset tạm thời để tránh xung đột index
                for (int i = 0; i < remainingSteps.Count; i++)
                {
                    remainingSteps[i].Renumber(10000 + (i + 1));
                }
                await _dbContext.SaveChangesAsync(cancellationToken);

                // Giai đoạn 2: Đánh lại số thứ tự chuẩn tuần tự 1, 2, 3...
                for (int i = 0; i < remainingSteps.Count; i++)
                {
                    remainingSteps[i].Renumber(i + 1);
                }
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

        }, cancellationToken);
        return true;
    }
}
