// ============================================================================
// CHỨC NĂNG: FR-RCP-007 - Xóa mềm công thức nấu ăn (Soft Delete theo Quyết định D1)
// THÀNH VIÊN: Lê Nhật Tiến (MSSV: 2312770)
// ============================================================================

using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.DeleteRecipe;

public record DeleteRecipeCommand(Guid Id) : IRequest;

public class DeleteRecipeCommandValidator : AbstractValidator<DeleteRecipeCommand>
{
    public DeleteRecipeCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty().WithMessage("ID công thức không được để trống.");
    }
}

public class DeleteRecipeCommandHandler : IRequestHandler<DeleteRecipeCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public DeleteRecipeCommandHandler(
        IApplicationDbContext context,
        ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task Handle(DeleteRecipeCommand request, CancellationToken ct)
    {
        var recipe = await _context.Recipes
            .FirstOrDefaultAsync(r => r.Id == request.Id, ct);

        if (recipe == null || recipe.IsDeleted)
        {
            throw new NotFoundException("Công thức", request.Id);
        }

        // Kiểm tra phân quyền: Tác giả hoặc Admin
        var isAuthor = !string.IsNullOrWhiteSpace(_currentUser.UserId) && _currentUser.UserId == recipe.AuthorId;
        var isAdmin = _currentUser.IsAdmin;
        if (!isAuthor && !isAdmin)
        {
            throw new ForbiddenException("Bạn không có quyền xóa công thức này.");
        }

        // Xóa mềm theo Quyết định D1
        recipe.MarkDeleted();
        await _context.SaveChangesAsync(ct);
    }
}
