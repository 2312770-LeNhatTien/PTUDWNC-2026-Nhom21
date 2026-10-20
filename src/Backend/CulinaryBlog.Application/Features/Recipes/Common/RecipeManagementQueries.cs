using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Application.Features.Recipes.Common;

internal static class RecipeManagementQueries
{
    public static IQueryable<Recipe> Detail(IApplicationDbContext db) => db.Recipes.AsNoTracking()
        .Include(r => r.Category).Include(r => r.Author)
        .Include(r => r.Ingredients).Include(r => r.Steps).Include(r => r.Images);
}
