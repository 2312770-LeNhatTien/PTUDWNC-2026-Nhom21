using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Interfaces;
using SlugVO = CulinaryBlog.Domain.ValueObjects.Slug;
using MediatR;

namespace CulinaryBlog.Application.Features.Categories.Commands.CreateCategory;

// FR-CAT-003: Admin tạo danh mục mới
public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, CategoryDto>
{
    private readonly ICategoryRepository _categoryRepository;

    public CreateCategoryCommandHandler(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<CategoryDto> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra tên danh mục không trùng lặp (nếu trùng trả về 409 Conflict)
        if (await _categoryRepository.NameExistsAsync(request.Name, ct: cancellationToken))
        {
            throw new ConflictException("Tên danh mục đã tồn tại.");
        }

        // 2. Tự động sinh slug chuẩn SEO từ Name (nếu trùng slug thì tự gắn hậu tố -2, -3,...)
        var baseSlug = SlugVO.Create(request.Name).Value;
        var slug = baseSlug;
        var suffix = 2;
        while (await _categoryRepository.GetBySlugAsync(slug, cancellationToken) != null)
        {
            slug = $"{baseSlug}-{suffix}";
            suffix++;
        }

        // 3. Khởi tạo Entity Category
        var category = Category.Create(
            name: request.Name,
            description: request.Description,
            imageUrl: request.ImageUrl,
            orderIndex: request.OrderIndex,
            slug: slug);

        // 4. Lưu vào Database
        await _categoryRepository.AddAsync(category, cancellationToken);
        await _categoryRepository.SaveChangesAsync(cancellationToken);

        // 5. Trả về CategoryDto (danh mục mới có RecipeCount = 0)
        return new CategoryDto(
            category.Id,
            category.Name,
            category.Slug,
            category.Description,
            category.ImageUrl,
            category.OrderIndex,
            RecipeCount: 0);
    }
}
