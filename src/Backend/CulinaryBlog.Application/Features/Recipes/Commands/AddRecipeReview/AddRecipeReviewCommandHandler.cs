using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Commands.AddRecipeReview;

public sealed class AddRecipeReviewCommandHandler : IRequestHandler<AddRecipeReviewCommand, RecipeReviewDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;

    public AddRecipeReviewCommandHandler(IApplicationDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<RecipeReviewDto> Handle(AddRecipeReviewCommand request, CancellationToken ct)
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
            throw new UnauthorizedException("Bạn cần đăng nhập để đánh giá công thức.");

        var recipeExists = await _db.Recipes.AnyAsync(recipe =>
            recipe.Id == request.RecipeId &&
            !recipe.IsDeleted &&
            recipe.Status == RecipeStatus.Published, ct);
        if (!recipeExists)
            throw new NotFoundException("Công thức", request.RecipeId);

        var alreadyReviewed = await _db.RecipeReviews.AnyAsync(review =>
            review.RecipeId == request.RecipeId && review.AuthorId == _currentUser.UserId, ct);
        if (alreadyReviewed)
            throw new ConflictException(
                "Bạn đã đánh giá công thức này. Mỗi tài khoản chỉ được đánh giá một lần.",
                "REVIEW_ALREADY_EXISTS");

        var review = RecipeReview.Create(
            request.RecipeId,
            _currentUser.UserId,
            request.Rating,
            request.Comment);

        await _db.RecipeReviews.AddAsync(review, ct);
        await _db.SaveChangesAsync(ct);

        var author = await _db.Users
            .AsNoTracking()
            .Where(user => user.Id == _currentUser.UserId)
            .Select(user => new { user.Id, user.DisplayName, user.AvatarUrl })
            .SingleAsync(ct);

        return new RecipeReviewDto(
            review.Id,
            author.Id,
            author.DisplayName,
            author.AvatarUrl,
            review.Rating,
            review.Comment,
            review.CreatedAt,
            review.UpdatedAt);
    }
}
