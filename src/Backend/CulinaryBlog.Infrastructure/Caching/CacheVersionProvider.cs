using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Caching;

public sealed class CacheVersionProvider(CulinaryBlogDbContext db) : ICacheVersionProvider
{
    public Task<string> GetAsync(CancellationToken ct) => db.Set<CacheVersion>().AsNoTracking()
        .Where(x => x.Id == 1).Select(x => x.Revision).SingleAsync(ct);
}
