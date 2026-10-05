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

    public async Task Handle(DeleteCategoryCommand request, CancellationToken ct)
    {
        var category = await _categoryRepository.GetByIdAsync(request.Id, ct)
            ?? throw new NotFoundException("Không tìm thấy danh mục.");

        if (await _categoryRepository.HasRecipesAsync(request.Id, ct))
        {
            throw new ConflictException("CATEGORY_NOT_EMPTY");
        }

        _categoryRepository.SoftDelete(category);
        await _categoryRepository.SaveChangesAsync(ct);
    }
}
