using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.Features.Files.Commands.DeleteFile;
using CulinaryBlog.Application.Features.Files.Commands.UploadFile;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CulinaryBlog.API.Endpoints;

public static class FilesEndpoints
{
    public static IEndpointRouteBuilder MapFilesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/files").WithTags("Files").RequireAuthorization();

        // Presigned PUT cũ bỏ qua kiểm tra bytes; client mới dùng upload proxy có validate.
        group.MapPost("/presigned-url", () => Results.Problem(statusCode: 410,
            title: "Dùng /api/v1/files/upload để tải ảnh có kiểm tra nội dung."))
            .RequireRateLimiting("UploadRateLimitPolicy").WithName("GetPresignedUploadUrl");

        group.MapPost("/upload", async (IFormFile file, [FromForm] string? folder,
            ISender sender, CancellationToken ct) =>
        {
            await using var stream = file.OpenReadStream();
            var result = await sender.Send(new UploadFileCommand(stream, file.FileName, file.ContentType, folder ?? "general", file.Length), ct);
            return Results.Ok(ApiResponse.Ok(result));
        }).DisableAntiforgery().RequireRateLimiting("UploadRateLimitPolicy").WithName("UploadFile");

        group.MapDelete("/", async ([FromQuery] string fileUrl, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new DeleteFileCommand(fileUrl), ct);
            return Results.Accepted();
        }).WithName("DeleteFile");
        return app;
    }
}
