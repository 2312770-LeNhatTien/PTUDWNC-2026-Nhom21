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
        var group = app.MapGroup(/api/v1/recipes).WithTags(Recipes);

        // FR-RCP-001: Lấy danh sách công thức (hỗ trợ phân trang)
        group.MapGet(/, async ([AsParameters] PagingParams paging, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new CulinaryBlog.Application.Features.Recipes.Queries.GetRecipes.GetRecipesQuery(paging), ct);
            return Results.Ok(ApiResponse.FromPaged(result));
        })
        .WithName(GetRecipes)
        .WithSummary(Lấy danh sách công thức nấu ăn (FR-RCP-001));

        // FR-RCP-003: Tạo công thức mới (Đã hoàn thành bởi Lê Nhật Tiến)
        group.MapPost(/, async (CreateRecipeCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Created($/api/v1/recipes/{result.Slug}, ApiResponse.Ok(result));
        })
        .WithName(CreateRecipe)
        .WithSummary(Tạo công thức mới (trạng thái Draft))
        .RequireAuthorization(AuthorOrAdmin);

        // FR-RCP-002: Lấy chi tiết công thức nấu ăn theo Slug (Lê Nhật Tiến - 2312770)
        group.MapGet(/{slug}, async (string slug, ISender sender, CancellationToken ct) =>
        {
            var recipe = await sender.Send(new CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeBySlug.GetRecipeBySlugQuery(slug), ct);
            return Results.Ok(ApiResponse.Ok(recipe));
        })
        .WithName(GetRecipeBySlug)
        .WithSummary(Xem chi tiết công thức nấu ăn theo slug kèm đầy đủ nguyên liệu, bước nấu và ảnh (FR-RCP-002));

        // ====================================================================
        // FR-RCP-010: QUẢN LÝ CÁC BƯỚC NẤU (NGUYỄN ĐÌNH TUẤN - 2312792)
        // TUÂN THỦ QUYẾT ĐỊNH KIẾN TRÚC D9: Tự sinh StepNumber nếu không truyền
        // ====================================================================

        // 1. GET /api/v1/recipes/{id}/steps - Lấy danh sách toàn bộ các bước nấu
        group.MapGet(/{id:guid}/steps, async (Guid id, ISender sender, CancellationToken ct) =>
        {
            // Gửi Query qua MediatR lấy danh sách bước nấu đã sắp xếp theo StepNumber tăng dần
            var steps = await sender.Send(new CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeSteps.GetRecipeStepsQuery(id), ct);
            return Results.Ok(ApiResponse.Ok(steps));
        })
        .WithName(GetRecipeSteps)
        .WithSummary(Lấy danh sách các bước nấu của công thức (FR-RCP-010));

        // 2. POST /api/v1/recipes/{id}/steps - Thêm bước nấu mới
        group.MapPost(/{id:guid}/steps, async (
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
            return Results.Created($/api/v1/recipes/{id}/steps/{result.Id}, ApiResponse.Ok(result));
        })
        .WithName(AddRecipeStep)
        .WithSummary(Thêm bước nấu mới vào công thức (FR-RCP-010));

        // 3. PUT /api/v1/recipes/{id}/steps/{stepId} - Cập nhật bước nấu đã có
        group.MapPut(/{id:guid}/steps/{stepId:guid}, async (
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
        .WithName(UpdateRecipeStep)
        .WithSummary(Cập nhật thông tin bước nấu của công thức (FR-RCP-010));

        // 4. DELETE /api/v1/recipes/{id}/steps/{stepId} - Xóa bước nấu và tự động renumber
        group.MapDelete(/{id:guid}/steps/{stepId:guid}, async (
            Guid id,
            Guid stepId,
            ISender sender,
            CancellationToken ct) =>
        {
            // Gửi DeleteRecipeStepCommand để xóa và renumber liên tục các bước còn lại
            var command = new CulinaryBlog.Application.Features.Recipes.Commands.ManageSteps.DeleteRecipeStepCommand(id, stepId);
            await sender.Send(command, ct);
            return Results.Ok(ApiResponse.Ok(Đã xóa bước nấu thành công.));
        })
        .WithName(DeleteRecipeStep)
        .WithSummary(Xóa bước nấu khỏi công thức và tự động renumber (FR-RCP-010));

        // ====================================================================
        // FR-RCP-009: QUẢN LÝ NGUYÊN LIỆU NẤU ĂN (TUÂN THỦ D10)
        // Thành viên: Nguyễn Đình Tuấn (MSSV: 2312792)
        // ====================================================================

        // 1. GET /api/v1/recipes/{id}/ingredients - Lấy danh sách nguyên liệu
        group.MapGet(/{id:guid}/ingredients, async (
            Guid id,
            ISender sender,
            CancellationToken ct) =>
        {
            var query = new CulinaryBlog.Application.Features.Recipes.Queries.GetRecipeIngredients.GetRecipeIngredientsQuery(id);
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse.Ok(result));
        })
        .WithName(GetRecipeIngredients)
        .WithSummary(Lấy danh sách nguyên liệu của công thức (FR-RCP-009));

        // 2. POST /api/v1/recipes/{id}/ingredients - Thêm nguyên liệu mới (D10: Quantity & Unit nullable)
        group.MapPost(/{id:guid}/ingredients, async (
            Guid id,
            AddIngredientRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            var command = new CulinaryBlog.Application.Features.Recipes.Commands.ManageIngredients.AddRecipeIngredientCommand(
                RecipeId: id,
                Name: request.Name,
                Quantity: request.Quantity,
                Unit: request.Unit,
                Notes: request.Notes,
                OrderIndex: request.OrderIndex
            );

            var result = await sender.Send(command, ct);
            return Results.Created($/api/v1/recipes/{id}/ingredients/{result.Id}, ApiResponse.Ok(result));
        })
        .WithName(AddRecipeIngredient)
        .WithSummary(Thêm nguyên liệu mới vào công thức (FR-RCP-009 - Tuân thủ D10))
        .RequireAuthorization(AuthorOrAdmin);

        // 3. PUT /api/v1/recipes/{id}/ingredients/{ingredientId} - Cập nhật nguyên liệu
        group.MapPut(/{id:guid}/ingredients/{ingredientId:guid}, async (
            Guid id,
            Guid ingredientId,
            UpdateIngredientRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            var command = new CulinaryBlog.Application.Features.Recipes.Commands.ManageIngredients.UpdateRecipeIngredientCommand(
                RecipeId: id,
                IngredientId: ingredientId,
                Name: request.Name,
                Quantity: request.Quantity,
                Unit: request.Unit,
                Notes: request.Notes,
                OrderIndex: request.OrderIndex
            );

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse.Ok(result));
        })
        .WithName(UpdateRecipeIngredient)
        .WithSummary(Cập nhật thông tin nguyên liệu của công thức (FR-RCP-009 - Tuân thủ D10))
        .RequireAuthorization(AuthorOrAdmin);

        // 4. DELETE /api/v1/recipes/{id}/ingredients/{ingredientId} - Xóa nguyên liệu
        group.MapDelete(/{id:guid}/ingredients/{ingredientId:guid}, async (
            Guid id,
            Guid ingredientId,
            ISender sender,
            CancellationToken ct) =>
        {
            var command = new CulinaryBlog.Application.Features.Recipes.Commands.ManageIngredients.DeleteRecipeIngredientCommand(id, ingredientId);
            await sender.Send(command, ct);
            return Results.Ok(ApiResponse.Ok(Đã xóa nguyên liệu thành công.));
        })
        .WithName(DeleteRecipeIngredient)
        .WithSummary(Xóa nguyên liệu khỏi công thức và tự động renumber (FR-RCP-009))
        .RequireAuthorization(AuthorOrAdmin);

        // ====================================================================
        // FR-RCP-008: QUẢN LÝ GALLERY ẢNH CÔNG THỨC (LÊ NHẬT TIẾN - 2312770)
        // ====================================================================

        // 1. POST /api/v1/recipes/{id}/images - Thêm ảnh vào gallery
        group.MapPost(/{id:guid}/images, async (
            Guid id,
            AddRecipeImageRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            var command = new CulinaryBlog.Application.Features.Recipes.Commands.ManageImages.AddRecipeImageCommand(
                RecipeId: id,
                OriginalUrl: request.OriginalUrl,
                AltText: request.AltText,
                IsPrimary: request.IsPrimary,
                OrderIndex: request.OrderIndex
            );

            var result = await sender.Send(command, ct);
            return Results.Created($/api/v1/recipes/{id}/images/{result.Id}, ApiResponse.Ok(result));
        })
        .WithName(AddRecipeImage)
        .WithSummary(Thêm ảnh mới vào bộ sưu tập công thức (FR-RCP-008))
        .RequireAuthorization(AuthorOrAdmin);

        // 2. DELETE /api/v1/recipes/{id}/images/{imageId} - Xóa ảnh khỏi gallery
        group.MapDelete(/{id:guid}/images/{imageId:guid}, async (
            Guid id,
            Guid imageId,
            ISender sender,
            CancellationToken ct) =>
        {
            await sender.Send(new CulinaryBlog.Application.Features.Recipes.Commands.ManageImages.DeleteRecipeImageCommand(id, imageId), ct);
            return Results.Ok(ApiResponse.Ok(Đã xóa ảnh khỏi công thức thành công.));
        })
        .WithName(DeleteRecipeImage)
        .WithSummary(Xóa ảnh khỏi bộ sưu tập công thức (FR-RCP-008))
        .RequireAuthorization(AuthorOrAdmin);

        // 3. PATCH /api/v1/recipes/{id}/images/{imageId}/primary - Đặt làm ảnh đại diện chính
        group.MapPatch(/{id:guid}/images/{imageId:guid}/primary, async (
            Guid id,
            Guid imageId,
            ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CulinaryBlog.Application.Features.Recipes.Commands.ManageImages.SetPrimaryImageCommand(id, imageId), ct);
            return Results.Ok(ApiResponse.Ok(result));
        })
        .WithName(SetPrimaryRecipeImage)
        .WithSummary(Đặt ảnh làm ảnh đại diện chính của công thức (FR-RCP-008))
        .RequireAuthorization(AuthorOrAdmin);

        return app;
    }
}

/// <summary>
/// Model nhận dữ liệu từ request body khi thêm nguyên liệu mới (D10: Quantity & Unit nullable).
/// </summary>
public record AddIngredientRequest(
    string Name,
    decimal? Quantity = null,
    string? Unit = null,
    string? Notes = null,
    int? OrderIndex = null
);

/// <summary>
/// Model nhận dữ liệu từ request body khi cập nhật nguyên liệu (D10: Quantity & Unit nullable).
/// </summary>
public record UpdateIngredientRequest(
    string Name,
    decimal? Quantity = null,
    string? Unit = null,
    string? Notes = null,
    int? OrderIndex = null
);

/// <summary>
/// Model nhận dữ liệu từ request body khi thêm ảnh vào gallery.
/// </summary>
public record AddRecipeImageRequest(
    string OriginalUrl,
    string? AltText = null,
    bool IsPrimary = false,
    int? OrderIndex = null
);

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
