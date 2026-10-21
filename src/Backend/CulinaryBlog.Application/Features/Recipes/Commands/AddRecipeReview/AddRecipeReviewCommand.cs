using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Commands.AddRecipeReview;

public record AddRecipeReviewCommand(
    Guid RecipeId,
    int Rating,
    string Comment
) : IRequest<RecipeReviewDto>;
