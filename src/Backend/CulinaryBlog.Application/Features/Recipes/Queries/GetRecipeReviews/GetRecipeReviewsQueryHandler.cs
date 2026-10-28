using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeReviews;

public sealed class GetRecipeReviewsQueryHandler : IRequestHandler<GetRecipeReviewsQuery, RecipeReviewsDto>
{
    private readonly IApplicationDbContext _db;

    public GetRecipeReviewsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<RecipeReviewsDto> Handle(GetRecipeReviewsQuery request, CancellationToken cancellationToken)
    {
        var recipeExists = await _db.Recipes.AnyAsync(recipe =>
            recipe.Id == request.RecipeId &&
            !recipe.IsDeleted &&
            recipe.Status == RecipeStatus.Published, cancellationToken);
        if (!recipeExists)
            throw new NotFoundException("Công thức", request.RecipeId);

        var reviews = await _db.RecipeReviews
            .AsNoTracking()
            .Where(review => review.RecipeId == request.RecipeId && !review.IsDeleted)
            .OrderByDescending(review => review.CreatedAt)
            .Select(review => new RecipeReviewDto(
                review.Id,
                review.AuthorId,
                review.Author != null ? review.Author.DisplayName : "Thành viên ẩn danh",
                review.Author != null ? review.Author.AvatarUrl : null,
                review.Rating,
                review.Comment,
                review.CreatedAt,
                review.UpdatedAt))
            .ToListAsync(cancellationToken);

        var average = reviews.Count == 0 ? 0m : Math.Round((decimal)reviews.Average(review => review.Rating), 2);
        return new RecipeReviewsDto(average, reviews.Count, reviews);
    }
}
