using CulinaryBlog.Application.Common.Interfaces;
using MediatR;

namespace CulinaryBlog.Application.Common.Behaviors;

// Invalidate after successful persistence. Recipe changes also affect published counts.
public sealed class CategoryCacheInvalidationBehavior<TRequest, TResponse>(ICacheService cache)
    : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var response = await next();
        var ns = typeof(TRequest).Namespace ?? "";
        if (ns.Contains(".Features.Categories.Commands.", StringComparison.Ordinal) ||
            ns.Contains(".Features.Recipes.Commands.", StringComparison.Ordinal))
        {
            // A disconnected HTTP client must not cancel invalidation after a committed write.
            await cache.SetAsync("cache-generation:categories", Guid.NewGuid().ToString("N"), TimeSpan.FromDays(3650));
            await cache.RemoveByPrefixAsync("categories:*");
        }
        return response;
    }
}

