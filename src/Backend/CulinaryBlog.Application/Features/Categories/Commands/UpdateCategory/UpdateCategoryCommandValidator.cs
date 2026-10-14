using FluentValidation;

namespace CulinaryBlog.Application.Features.Categories.Commands.UpdateCategory;

public class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ImageUrl).MaximumLength(500);
        RuleFor(x => x.OrderIndex).GreaterThanOrEqualTo(0).When(x => x.OrderIndex.HasValue);
    }
}
