using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Domain.Interfaces;
using MediatR;

namespace CulinaryBlog.Application.Features.Categories.Commands.DeleteCategory;

public class DeleteCategoryCommandHandler : IRequestHandler<DeleteCategoryCommand>
{
    private readonly ICategoryRepository _categoryRepository;

    public DeleteCategoryCommandHandler(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await _categoryRepository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy danh mục.");

        if (await _categoryRepository.HasRecipesAsync(request.Id, cancellationToken))
        {
            throw new ConflictException("CATEGORY_NOT_EMPTY");
        }

        _categoryRepository.SoftDelete(category);
        await _categoryRepository.SaveChangesAsync(cancellationToken);
    }
}
