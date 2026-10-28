// ============================================================================
// CHỨC NĂNG: FR-RCP-010 - Lấy danh sách các bước nấu của một công thức
// THÀNH VIÊN: Nguyễn Đình Tuấn (MSSV: 2312792)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeSteps;

/// <summary>
/// Query lấy toàn bộ các bước nấu của một công thức, sắp xếp tăng dần theo StepNumber.
/// </summary>
public record GetRecipeStepsQuery(Guid RecipeId) : IRequest<IReadOnlyList<RecipeStepDto>>;

/// <summary>
/// Validator kiểm tra ID công thức hợp lệ trước khi truy vấn.
/// </summary>
public class GetRecipeStepsQueryValidator : AbstractValidator<GetRecipeStepsQuery>
{
    public GetRecipeStepsQueryValidator()
    {
        RuleFor(x => x.RecipeId)
            .NotEmpty().WithMessage("ID công thức không được để trống.");
    }
}

/// <summary>
/// Handler xử lý truy vấn đọc danh sách các bước nấu (Read-Only Query).
/// Sử dụng AsNoTracking để tối ưu hóa hiệu năng đọc dữ liệu từ PostgreSQL.
/// </summary>
public class GetRecipeStepsQueryHandler : IRequestHandler<GetRecipeStepsQuery, IReadOnlyList<RecipeStepDto>>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetRecipeStepsQueryHandler(IApplicationDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<RecipeStepDto>> Handle(GetRecipeStepsQuery request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra công thức có tồn tại trong hệ thống hay không
        var exists = await _dbContext.Recipes
            .AnyAsync(r => r.Id == request.RecipeId &&
                (r.Status == CulinaryBlog.Domain.Enums.RecipeStatus.Published ||
                 (_currentUser.IsAuthenticated && (_currentUser.IsAdmin || r.AuthorId == _currentUser.UserId))), cancellationToken);

        if (!exists)
        {
            throw new NotFoundException("Công thức", request.RecipeId);
        }

        // 2. Truy vấn danh sách các bước nấu, sắp xếp tăng dần theo StepNumber
        var steps = await _dbContext.RecipeSteps
            .AsNoTracking()
            .Where(s => s.RecipeId == request.RecipeId)
            .OrderBy(s => s.StepNumber)
            .Select(s => new RecipeStepDto(
                s.Id,
                s.StepNumber,
                s.Title,
                s.Description,
                s.TimerMinutes,
                s.ImageUrl
            ))
            .ToListAsync(cancellationToken);

        return steps;
    }
}
