using System.Reflection;
using CulinaryBlog.Application.Common.Behaviors;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace CulinaryBlog.Application;

// Đăng ký service của tầng Application.
// Program.cs chỉ cần gọi builder.Services.AddApplication().
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // MediatR tự quét và đăng ký mọi IRequestHandler trong assembly này.
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));

        // FluentValidation tự quét mọi AbstractValidator.
        services.AddValidatorsFromAssembly(assembly);

        // Pipeline Behaviors cơ bản: Logging -> Validation
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(CategoryCacheInvalidationBehavior<,>));
        return services;
    }
}
