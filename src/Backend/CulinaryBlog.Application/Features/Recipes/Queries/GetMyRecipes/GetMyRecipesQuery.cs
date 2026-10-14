using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetMyRecipes;

public record GetMyRecipesQuery(PagingParams Paging, RecipeStatus? Status = null) : IRequest<PagedResult<MyRecipeDto>>;

public class GetMyRecipesValidator : AbstractValidator<GetMyRecipesQuery>
{
    public GetMyRecipesValidator() => RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue);
}

public class GetMyRecipesHandler(IApplicationDbContext db, ICurrentUser user)
    : IRequestHandler<GetMyRecipesQuery, PagedResult<MyRecipeDto>>
{
    public async Task<PagedResult<MyRecipeDto>> Handle(GetMyRecipesQuery request, CancellationToken ct)
    {
        if (!user.IsAuthenticated || string.IsNullOrEmpty(user.UserId)) throw new UnauthorizedException("Vui lòng đăng nhập.");
        var query = db.Recipes.AsNoTracking().Where(r => r.AuthorId == user.UserId);
        if (request.Status.HasValue) query = query.Where(r => r.Status == request.Status.Value);
        var total = await query.CountAsync(ct);
        var page = request.Paging.Page ?? 1;
        var pageSize = request.Paging.PageSize ?? 12;
        var desc = request.Paging.IsDescending;
        var ordered = request.Paging.SortBy?.ToLowerInvariant() switch
        {
            "title" => desc ? query.OrderByDescending(r => r.Title) : query.OrderBy(r => r.Title),
            "cooktime" => desc ? query.OrderByDescending(r => r.CookTime) : query.OrderBy(r => r.CookTime),
            "preptime" => desc ? query.OrderByDescending(r => r.PrepTime) : query.OrderBy(r => r.PrepTime),
            "updatedat" => desc ? query.OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt) : query.OrderBy(r => r.UpdatedAt ?? r.CreatedAt),
            _ => desc ? query.OrderByDescending(r => r.CreatedAt) : query.OrderBy(r => r.CreatedAt),
        };
        var items = await ordered.ThenBy(r => r.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new MyRecipeDto(r.Id, r.Title, r.Slug, r.Status.ToString(),
                r.Images.Where(i => i.IsPrimary).Select(i => i.OriginalUrl).FirstOrDefault(),
                r.Category != null ? r.Category.Name : "", r.CreatedAt, r.UpdatedAt)).ToListAsync(ct);
        return new(items, page, pageSize, total);
    }
}
