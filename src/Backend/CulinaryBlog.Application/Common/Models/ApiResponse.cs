namespace CulinaryBlog.Application.Common.Models;

// SRS mục 8 - Response wrapper:
//   { "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }
// "meta" chỉ có ở endpoint trả danh sách phân trang.
// Lỗi KHÔNG dùng wrapper này - dùng RFC 7807 ProblemDetails
// (xem CulinaryBlog.API/Middleware/GlobalExceptionMiddleware.cs).
public sealed record ApiResponse<T>(T Data, PaginationMeta? Meta = null);

public sealed record PaginationMeta(int Page, int PageSize, int Total, int TotalPages,
    bool HasNextPage = false, bool HasPreviousPage = false);

public static class ApiResponse
{
    // Endpoint trả 1 đối tượng
    public static ApiResponse<T> Ok<T>(T data) => new(data);

    // Endpoint trả danh sách phân trang - tự tách Items + meta
    public static ApiResponse<IReadOnlyList<T>> FromPaged<T>(PagedResult<T> result)
        => new(result.Items, new PaginationMeta(
            result.Page, result.PageSize, result.Total, result.TotalPages, result.HasNextPage, result.HasPreviousPage));
}
