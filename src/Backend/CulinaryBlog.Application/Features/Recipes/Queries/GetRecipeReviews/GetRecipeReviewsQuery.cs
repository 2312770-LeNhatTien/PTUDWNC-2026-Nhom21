using CulinaryBlog.Application.DTOs;
using MediatR;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeReviews;

public record GetRecipeReviewsQuery(Guid RecipeId) : IRequest<RecipeReviewsDto>;
