using System.Net;
using System.Net.Http.Headers;
using CulinaryBlog.API.Middleware;
using CulinaryBlog.Application.Common.Exceptions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace CulinaryBlog.Tests;

public sealed class ProblemDetailsAndSecurityTests
{
    [Theory]
    [InlineData("validation", 400)]
    [InlineData("unauthorized", 401)]
    [InlineData("forbidden", 403)]
    [InlineData("not-found", 404)]
    [InlineData("conflict", 409)]
    [InlineData("unexpected", 500)]
    public async Task Exception_handler_uses_problem_json_for_all_documented_error_codes(string kind, int expectedStatus)
    {
        Exception exception = kind switch
        {
            "validation" => new ValidationException("title", "Tiêu đề không hợp lệ."),
            "unauthorized" => new UnauthorizedException("Token không hợp lệ."),
            "forbidden" => new ForbiddenException(),
            "not-found" => new NotFoundException("Recipe không tồn tại."),
            "conflict" => new ConflictException("Slug đã tồn tại.", "RECIPE_SLUG_EXISTS"),
            _ => new InvalidOperationException("Không được trả chi tiết lỗi này."),
        };
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/test";
        context.Items["CorrelationId"] = "problem-test";

        var handler = new GlobalExceptionMiddleware(NullLogger<GlobalExceptionMiddleware>.Instance);
        Assert.True(await handler.TryHandleAsync(context, exception, CancellationToken.None));

        Assert.Equal(expectedStatus, context.Response.StatusCode);
        Assert.Equal("application/problem+json", context.Response.ContentType);
        Assert.Equal("problem-test", context.Response.Headers["X-Correlation-ID"].ToString());
    }

    [Fact]
    public async Task Security_headers_are_added_when_downstream_throws_before_exception_handler_writes()
    {
        using var host = await new HostBuilder()
            .ConfigureWebHost(webHost => webHost
                .UseTestServer()
                .UseEnvironment("Production")
                .Configure(app =>
                {
                    app.UseMiddleware<SecurityHeadersMiddleware>();
                    app.Use(async (context, next) =>
                    {
                        try { await next(); }
                        catch
                        {
                            context.Response.Clear();
                            context.Response.StatusCode = 500;
                            context.Response.ContentType = "application/problem+json";
                            await context.Response.WriteAsync("error");
                        }
                    });
                    app.Run(_ => throw new InvalidOperationException("boom"));
                }))
            .StartAsync();
        using var client = host.GetTestClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://localhost/error");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        AssertSecurityHeaders(response.Headers);
        Assert.Equal("max-age=31536000; includeSubDomains", response.Headers.GetValues("Strict-Transport-Security").Single());
    }

    private static void AssertSecurityHeaders(HttpResponseHeaders headers)
    {
        Assert.Equal("nosniff", headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("strict-origin-when-cross-origin", headers.GetValues("Referrer-Policy").Single());
        Assert.Equal("camera=(), microphone=(), geolocation=()", headers.GetValues("Permissions-Policy").Single());
    }

}
