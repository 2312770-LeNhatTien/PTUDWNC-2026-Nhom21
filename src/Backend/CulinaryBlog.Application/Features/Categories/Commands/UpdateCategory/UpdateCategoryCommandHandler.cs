using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Interfaces;
using MediatR;

namespace CulinaryBlog.Application.Features.Categories.Commands.UpdateCategory;

public class UpdateCategoryCommandHandler : IRequestHandler<UpdateCategoryCommand, CategoryDto>
{
    private readonly ICategoryRepository _categoryRepository;

    public UpdateCategoryCommandHandler(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<CategoryDto> Handle(UpdateCategoryCommand request, CancellationToken ct)
    {
        var category = await _categoryRepository.GetByIdAsync(request.Id, ct)
                       ?? throw new NotFoundException("Không tìm thấy danh mục.");

        // Nếu đổi tên khác, cần check xem tên mới đã bị ai dùng chưa
        if (!string.IsNullOrWhiteSpace(request.Name) && 
            request.Name != category.Name && 
            await _categoryRepository.NameExistsAsync(request.Name, ct: ct))
        {
            throw new ConflictException("Tên danh mục đã tồn tại.");
        }

        category.Update(request.Name, request.Description, request.ImageUrl, request.OrderIndex);

        _categoryRepository.Update(category);
        await _categoryRepository.SaveChangesAsync(ct);

        return new CategoryDto(
            category.Id,
            category.Name,
            category.Slug,
            category.Description,
            category.ImageUrl,
            category.OrderIndex,
            category.Recipes?.Count ?? 0);
    }
}
