using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CulinaryBlog.Infrastructure.Persistence;

// Sinh migration không khởi chạy API Development, vì startup có thể migrate/seed DB.
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<CulinaryBlogDbContext>
{
    public CulinaryBlogDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Database=culinary_blog_design_only;Username=postgres";
        return new(new DbContextOptionsBuilder<CulinaryBlogDbContext>().UseNpgsql(connection).Options);
    }
}
