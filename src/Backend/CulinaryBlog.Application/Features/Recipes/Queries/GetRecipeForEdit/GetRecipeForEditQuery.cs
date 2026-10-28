using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Application.Features.Recipes.Common;
using CulinaryBlog.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeForEdit;

public record GetRecipeForEditQuery(Guid Id) : IRequest<RecipeEditDto>;

public class GetRecipeForEditHandler(IApplicationDbContext db, ICurrentUser user)
    : IRequestHandler<GetRecipeForEditQuery, RecipeEditDto>
{
    public async Task<RecipeEditDto> Handle(GetRecipeForEditQuery request, CancellationToken cancellationToken)
    {
        if (!user.IsAuthenticated) throw new UnauthorizedException("Vui lòng đăng nhập.");
        var recipe = await RecipeManagementQueries.Detail(db).FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Công thức", request.Id);
        if (recipe.AuthorId != user.UserId && !user.IsAdmin) throw new ForbiddenException("Bạn không có quyền quản lý công thức này.");
        return RecipeManagementMapping.ToEditDto(recipe);
    }
}
