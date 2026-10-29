using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CulinaryBlog.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task MigrateAsync(IServiceProvider services)
    {
        // Một migrator chạy trước API; không tự thay schema/seed trên từng replica.
        using var scope = services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>().Database.MigrateAsync();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Admin", "Author", "User" })
            if (!await roles.RoleExistsAsync(role))
            {
                var result = await roles.CreateAsync(new IdentityRole(role));
                if (!result.Succeeded) throw new InvalidOperationException($"Không tạo được role {role}.");
            }
    }
}
