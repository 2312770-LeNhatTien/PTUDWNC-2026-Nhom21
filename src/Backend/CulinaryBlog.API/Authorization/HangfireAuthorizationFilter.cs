using System.Security.Claims;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Domain.Entities;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.API.Authorization;

public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public const string Scheme = "HangfireAdmin";
    public const string RefreshHashClaim = "hangfire_refresh_hash";
    public bool Authorize(DashboardContext context)
    {
        var user = context.GetHttpContext().User;
        return user.Identity?.IsAuthenticated == true && user.IsInRole("Admin");
    }

    public static void ConfigureCookie(CookieAuthenticationOptions options, bool development)
    {
        options.Cookie.Name = ".Culinary.Hangfire";
        options.Cookie.Path = "/hangfire";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = development ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(15);
        options.SlidingExpiration = false;
        options.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
        options.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; };
        options.Events.OnValidatePrincipal = async ctx =>
        {
            var id = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            var hash = ctx.Principal?.FindFirstValue(RefreshHashClaim);
            var db = ctx.HttpContext.RequestServices.GetRequiredService<IApplicationDbContext>();
            var manager = ctx.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
            var user = id is null ? null : await manager.FindByIdAsync(id);
            var active = user?.IsActive == true && await manager.IsInRoleAsync(user, "Admin") &&
                await db.RefreshTokens.AnyAsync(t => t.UserId == id && t.TokenHash == hash &&
                    t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow, ctx.HttpContext.RequestAborted);
            if (!active) ctx.RejectPrincipal();
        };
    }
}
