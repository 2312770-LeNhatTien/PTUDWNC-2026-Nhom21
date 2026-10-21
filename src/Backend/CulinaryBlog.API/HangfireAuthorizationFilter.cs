using Hangfire.Dashboard;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace CulinaryBlog.API;

/// <summary>
/// Bộ lọc phân quyền bảo vệ Hangfire Dashboard (/hangfire).
/// Cho phép truy cập ở môi trường Development hoặc khi người dùng có vai trò Admin.
/// </summary>
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        var env = httpContext.RequestServices.GetService<IWebHostEnvironment>();
        if (env?.IsDevelopment() == true)
        {
            return true;
        }

        return httpContext.User.Identity?.IsAuthenticated == true &&
               httpContext.User.IsInRole("Admin");
    }
}
