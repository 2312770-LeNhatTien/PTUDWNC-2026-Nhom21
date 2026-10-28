using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Seo.Queries.GetSitemapEntries;

public record SitemapEntry(string Path, DateTime? LastModified);
public record GetSitemapEntriesQuery : IRequest<IReadOnlyList<SitemapEntry>>;

public class GetSitemapEntriesHandler(IApplicationDbContext db)
    : IRequestHandler<GetSitemapEntriesQuery, IReadOnlyList<SitemapEntry>>
{
    public async Task<IReadOnlyList<SitemapEntry>> Handle(GetSitemapEntriesQuery request, CancellationToken ct)
    {
        // Global query filters preserve D1. Read all public URLs, without API pagination/cache.
        var recipes = await db.Recipes.AsNoTracking().Where(r => r.Status == RecipeStatus.Published)
            .Select(r => new { r.Slug, Modified = r.UpdatedAt ?? r.PublishedAt ?? r.CreatedAt }).ToListAsync(ct);
        var categories = await db.Categories.AsNoTracking()
            .Select(c => new { c.Slug, Modified = c.UpdatedAt ?? c.CreatedAt }).ToListAsync(ct);
        return new[] { new SitemapEntry("/", null), new("/recipes", null), new("/categories", null) }
            .Concat(recipes.Select(r => new SitemapEntry("/recipes/" + Uri.EscapeDataString(r.Slug), ValidDate(r.Modified))))
            .Concat(categories.Select(c => new SitemapEntry("/categories/" + Uri.EscapeDataString(c.Slug), ValidDate(c.Modified))))
            .OrderBy(e => e.Path, StringComparer.Ordinal).ToList();
    }

    private static DateTime? ValidDate(DateTime date) => date > DateTime.MinValue && date < DateTime.MaxValue ? date : null;
}
