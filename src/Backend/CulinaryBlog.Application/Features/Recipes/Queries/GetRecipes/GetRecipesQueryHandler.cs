// ============================================================================
// CHỨC NĂNG: FR-RCP-001 - Danh sách công thức nấu ăn (phân trang cơ bản)
// ============================================================================

using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Queries.GetRecipes;

public class GetRecipesQueryHandler : IRequestHandler<GetRecipesQuery, PagedResult<RecipeListItemDto>>
{
    private readonly IApplicationDbContext _dbContext;

    public GetRecipesQueryHandler(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResult<RecipeListItemDto>> Handle(GetRecipesQuery request, CancellationToken cancellationToken)
    {
        // 1. Khởi tạo truy vấn AsNoTracking tối ưu hiệu năng
        var query = _dbContext.Recipes
            .AsNoTracking()
            .Include(r => r.Category)
            .Include(r => r.Author)
            .Include(r => r.Images)
            .Where(r => r.Status == CulinaryBlog.Domain.Enums.RecipeStatus.Published && !r.IsDeleted)
            .AsQueryable();

        // 2. Lọc theo danh mục nếu có
        if (request.CategoryId.HasValue)
        {
            query = query.Where(r => r.CategoryId == request.CategoryId.Value);
        }

        // 3. Lọc theo độ khó nếu có
        if (request.Difficulty.HasValue)
        {
            query = query.Where(r => r.Difficulty == request.Difficulty.Value);
        }

        if (request.MaxCookTime.HasValue)
        {
            query = query.Where(r => r.CookTime <= request.MaxCookTime.Value);
        }

        if (request.MaxTotalTime.HasValue)
        {
            query = query.Where(r => (r.PrepTime + r.CookTime) <= request.MaxTotalTime.Value);
        }

        // 4. Tính toán tổng số lượng bản ghi
        if (request.MinServings.HasValue) query = query.Where(r => r.Servings >= request.MinServings.Value);
        var total = await query.CountAsync(cancellationToken);

        // 5. Chuẩn hóa tham số phân trang
        int page = request.Paging.Page is > 0 ? request.Paging.Page.Value : 1;
        int pageSize = request.Paging.PageSize ?? 12;

        // 5.5. Sắp xếp đa cú pháp
        query = request.Paging.SortBy?.ToLower() switch
        {
            "title" => request.Paging.IsDescending ? query.OrderByDescending(r => r.Title).ThenBy(r => r.Id) : query.OrderBy(r => r.Title).ThenBy(r => r.Id),
            "cooktime" => request.Paging.IsDescending ? query.OrderByDescending(r => r.CookTime).ThenBy(r => r.Id) : query.OrderBy(r => r.CookTime).ThenBy(r => r.Id),
            "preptime" => request.Paging.IsDescending ? query.OrderByDescending(r => r.PrepTime).ThenBy(r => r.Id) : query.OrderBy(r => r.PrepTime).ThenBy(r => r.Id),
            "difficulty" => request.Paging.IsDescending ? query.OrderByDescending(r => r.Difficulty).ThenBy(r => r.Id) : query.OrderBy(r => r.Difficulty).ThenBy(r => r.Id),
            _ => request.Paging.IsDescending ? query.OrderByDescending(r => r.CreatedAt).ThenBy(r => r.Id) : query.OrderBy(r => r.CreatedAt).ThenBy(r => r.Id) // Mặc định createdAt
        };

        // 6. Lấy dữ liệu theo trang và ánh xạ sang RecipeListItemDto
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RecipeListItemDto(
                r.Id,
                r.Title,
                r.Slug,
                r.Description,
                r.PrepTime,
                r.CookTime,
                r.Servings,
                r.Difficulty.ToString(),
                r.Status.ToString(),
                r.Images.FirstOrDefault(i => i.IsPrimary) != null ? (r.Images.FirstOrDefault(i => i.IsPrimary)!.ThumbnailUrl ?? r.Images.FirstOrDefault(i => i.IsPrimary)!.OriginalUrl) : null,
                r.Category != null ? r.Category.Name : "Khác",
                r.Author != null ? r.Author.DisplayName : "Đầu bếp",
                r.PublishedAt,
                !r.Reviews.Any(review => !review.IsDeleted)
                    ? 0
                    : (decimal)r.Reviews.Where(review => !review.IsDeleted).Average(review => review.Rating),
                r.Reviews.Count(review => !review.IsDeleted)
            ))
            .ToListAsync(cancellationToken);

        return new PagedResult<RecipeListItemDto>(items, page, pageSize, total);
    }
}
