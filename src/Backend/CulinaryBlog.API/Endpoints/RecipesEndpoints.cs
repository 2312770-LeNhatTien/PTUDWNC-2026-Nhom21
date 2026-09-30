// SRS mục 8.3 đến 8.6 - Recipes Module (/api/v1/recipes)

using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.DTOs;
using CulinaryBlog.Application.Features.Recipes.Commands.CreateRecipe;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public static class RecipesEndpoints
{
    public static IEndpointRouteBuilder MapRecipesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/recipes").WithTags("Recipes");

        // FR-RCP-001: Lấy danh sách công thức (hỗ trợ phân trang)
        group.MapGet("/", async ([AsParameters] PagingParams paging, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new CulinaryBlog.Application.Features.Recipes.Queries.GetRecipes.GetRecipesQuery(paging), ct);
            return Results.Ok(ApiResponse.FromPaged(result));
        })
        .WithName("GetRecipes")
        .WithSummary("Lấy danh sách công thức nấu ăn (FR-RCP-001)");

        // FR-RCP-003: Tạo công thức mới (Đã hoàn thành bởi Lê Nhật Tiến)
        group.MapPost("/", async (CreateRecipeCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Created($"/api/v1/recipes/{result.Slug}", ApiResponse.Ok(result));
        })
        .WithName("CreateRecipe")
        .WithSummary("Tạo công thức mới (trạng thái Draft)")
        .RequireAuthorization("AuthorOrAdmin");

        // ====================================================================
        // FR-RCP-010: QUẢN LÝ CÁC BƯỚC NẤU (NGUYỄN ĐÌNH TUẤN - 2312792)
        // TUÂN THỦ QUYẾT ĐỊNH KIẾN TRÚC D9: Tự sinh StepNumber nếu không truyền
        // ====================================================================

        // 1. GET /api/v1/recipes/{id}/steps - Lấy danh sách toàn bộ các bước nấu
        group.MapGet("/{id:guid}/steps", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            // Gửi Query qua MediatR lấy danh sách bước nấu đã sắp xếp theo StepNumber tăng dần
            var steps = await sender.Send(new CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeSteps.GetRecipeStepsQuery(id), ct);
            return Results.Ok(ApiResponse.Ok(steps));
        })
        .WithName("GetRecipeSteps")
        .WithSummary("Lấy danh sách các bước nấu của công thức (FR-RCP-010)");

        // 2. POST /api/v1/recipes/{id}/steps - Thêm bước nấu mới
        group.MapPost("/{id:guid}/steps", async (
            Guid id,
            AddStepRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            // Ánh xạ sang AddRecipeStepCommand để MediatR pipeline xác thực và xử lý logic D9
            var command = new CulinaryBlog.Application.Features.Recipes.Commands.ManageSteps.AddRecipeStepCommand(
                RecipeId: id,
                Title: request.Title,
                Description: request.Description,
                StepNumber: request.StepNumber,
                TimerMinutes: request.TimerMinutes,
                ImageUrl: request.ImageUrl
            );

            var result = await sender.Send(command, ct);
            return Results.Created($"/api/v1/recipes/{id}/steps/{result.Id}", ApiResponse.Ok(result));
        })
        .WithName("AddRecipeStep")
        .WithSummary("Thêm bước nấu mới vào công thức (FR-RCP-010)");

        // 3. PUT /api/v1/recipes/{id}/steps/{stepId} - Cập nhật bước nấu đã có
        group.MapPut("/{id:guid}/steps/{stepId:guid}", async (
            Guid id,
            Guid stepId,
            UpdateStepRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            // Ánh xạ sang UpdateRecipeStepCommand cập nhật thông tin và thứ tự bước nếu có
            var command = new CulinaryBlog.Application.Features.Recipes.Commands.ManageSteps.UpdateRecipeStepCommand(
                RecipeId: id,
                StepId: stepId,
                Title: request.Title,
                Description: request.Description,
                StepNumber: request.StepNumber,
                TimerMinutes: request.TimerMinutes,
                ImageUrl: request.ImageUrl
            );

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse.Ok(result));
        })
        .WithName("UpdateRecipeStep")
        .WithSummary("Cập nhật thông tin bước nấu của công thức (FR-RCP-010)");

        // 4. DELETE /api/v1/recipes/{id}/steps/{stepId} - Xóa bước nấu và tự động renumber
        group.MapDelete("/{id:guid}/steps/{stepId:guid}", async (
            Guid id,
            Guid stepId,
            ISender sender,
            CancellationToken ct) =>
        {
            // Gửi DeleteRecipeStepCommand để xóa và renumber liên tục các bước còn lại
            var command = new CulinaryBlog.Application.Features.Recipes.Commands.ManageSteps.DeleteRecipeStepCommand(id, stepId);
            await sender.Send(command, ct);
            return Results.Ok(ApiResponse.Ok("Đã xóa bước nấu thành công."));
        })
        .WithName("DeleteRecipeStep")
        .WithSummary("Xóa bước nấu khỏi công thức và tự động renumber (FR-RCP-010)");

        // ====================================================================
        // FR-RCP-005: XUẤT BẢN / HỦY XUẤT BẢN CÔNG THỨC (LÂM VĂN ĐỨC - 2314299)
        // TUÂN THỦ QUYẾT ĐỊNH KIẾN TRÚC D11: Kiểm tra >= 1 nguyên liệu và >= 1 bước nấu
        // ====================================================================

        // 5. PATCH /api/v1/recipes/{id}/publish - Xuất bản công thức (kiểm tra D11)
        group.MapPatch("/{id:guid}/publish", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new CulinaryBlog.Application.Features.Recipes.Commands.PublishRecipe.PublishRecipeCommand(id), ct);
            return Results.Ok(ApiResponse.Ok(result));
        })
        .WithName("PublishRecipe")
        .WithSummary("Xuất bản công thức nấu ăn (FR-RCP-005, kiểm tra D11)")
        .RequireAuthorization();

        // 6. PATCH /api/v1/recipes/{id}/unpublish - Hủy xuất bản công thức về Draft
        group.MapPatch("/{id:guid}/unpublish", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new CulinaryBlog.Application.Features.Recipes.Commands.PublishRecipe.UnpublishRecipeCommand(id), ct);
            return Results.Ok(ApiResponse.Ok(result));
        })
        .WithName("UnpublishRecipe")
        .WithSummary("Hủy xuất bản công thức nấu ăn về trạng thái Draft (FR-RCP-005)")
        .RequireAuthorization();

        return app;
    }
}

/// <summary>
/// Model nhận dữ liệu từ request body khi thêm bước nấu mới (D9: StepNumber tùy chọn).
/// </summary>
public record AddStepRequest(
    string Title,
    string Description,
    int? StepNumber = null,
    int? TimerMinutes = null,
    string? ImageUrl = null
);

/// <summary>
/// Model nhận dữ liệu từ request body khi cập nhật bước nấu.
/// </summary>
public record UpdateStepRequest(
    string Title,
    string Description,
    int? StepNumber = null,
    int? TimerMinutes = null,
    string? ImageUrl = null
);

