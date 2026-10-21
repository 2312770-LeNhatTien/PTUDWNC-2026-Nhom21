using FluentValidation;

namespace CulinaryBlog.Application.Features.Recipes.Commands.AddRecipeReview;

public sealed class AddRecipeReviewCommandValidator : AbstractValidator<AddRecipeReviewCommand>
{
    public AddRecipeReviewCommandValidator()
    {
        RuleFor(command => command.RecipeId).NotEmpty();
        RuleFor(command => command.Rating).InclusiveBetween(1, 5)
            .WithMessage("Điểm đánh giá phải từ 1 đến 5 sao.");
        RuleFor(command => command.Comment)
            .NotEmpty().WithMessage("Bình luận không được để trống.")
            .MaximumLength(2000).WithMessage("Bình luận không được dài quá 2000 ký tự.");
    }
}
