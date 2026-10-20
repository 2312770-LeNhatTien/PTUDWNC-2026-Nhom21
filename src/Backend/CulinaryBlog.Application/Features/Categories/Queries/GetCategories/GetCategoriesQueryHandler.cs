using System.Diagnostics;
using Microsoft.Extensions.Logging;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Domain.Interfaces;
using CulinaryBlog.Domain.Enums; // Thêm dòng này để dùng RecipeStatus
using MediatR;
using Microsoft.EntityFrameworkCore; // Thêm dòng này để dùng ToListAsync()

namespace CulinaryBlog.Application.Features.Categories.Queries.GetCategories;

// FR-CAT-001 - Xem danh sách danh mục (kèm số công thức Published và sắp xếp theo OrderIndex).
public class GetCategoriesQueryHandler : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    private readonly ICategoryRepository _categoryRepository;

    private readonly ICacheService _cache;
    private readonly ILogger<GetCategoriesQueryHandler> _logger;
    public GetCategoriesQueryHandler(ICategoryRepository categoryRepository, ICacheService cache,
        ILogger<GetCategoriesQueryHandler> logger)
    {
        _categoryRepository = categoryRepository;
        _cache = cache;
        _logger = logger;
    }

   public async Task<IReadOnlyList<CategoryDto>> Handle(GetCategoriesQuery request, CancellationToken ct)
    {
        var timer = Stopwatch.StartNew();
        var generation = await _cache.GetAsync<string>("cache-generation:categories", ct) ?? "0";
        var key = $"categories:all:v1:{generation}";
        var cached = await _cache.GetAsync<List<CategoryDto>>(key, ct);
        if (cached is not null)
        {
            _logger.LogInformation("Categories cache {CacheStatus} in {ElapsedMs} ms", "HIT", timer.Elapsed.TotalMilliseconds);
            return cached;
        }
        var categories = await _categoryRepository.Query()
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.OrderIndex)
            .Select(c => new CategoryDto(
                c.Id,
                c.Name,
                c.Slug, 
                c.Description,
                c.ImageUrl,
                c.OrderIndex,
                c.Recipes.Count(r => r.Status == RecipeStatus.Published && !r.IsDeleted)
            ))
            .ToListAsync(ct);

        await _cache.SetAsync(key, categories, TimeSpan.FromMinutes(30), ct);
        _logger.LogInformation("Categories cache {CacheStatus} in {ElapsedMs} ms", "MISS", timer.Elapsed.TotalMilliseconds);
        return categories;
    }
}
