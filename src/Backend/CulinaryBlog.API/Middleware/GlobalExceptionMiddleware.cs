using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Domain.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ValidationException = CulinaryBlog.Application.Common.Exceptions.ValidationException;

namespace CulinaryBlog.API.Middleware;

// CONS-005 - mọi lỗi trả về PHẢI theo RFC 7807 (application/problem+json).
// Nhờ đó các endpoint không phải tự try/catch, cứ ném exception đúng loại
// là tự map sang HTTP status tương ứng (bảng Phụ lục A của SRS).
public class GlobalExceptionMiddleware : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(ILogger<GlobalExceptionMiddleware> logger)
        => _logger = logger;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        var (status, title) = exception switch
        {
            ValidationException   => (StatusCodes.Status400BadRequest, "Dữ liệu không hợp lệ."),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, "Chưa xác thực."),
            ForbiddenException    => (StatusCodes.Status403Forbidden, "Không có quyền truy cập."),
            NotFoundException     => (StatusCodes.Status404NotFound, "Không tìm thấy tài nguyên."),
            ConflictException     => (StatusCodes.Status409Conflict, "Xung đột dữ liệu."),
            LockedException       => (StatusCodes.Status423Locked, "Tài khoản bị tạm khóa."),
            // Vi phạm business rule của Domain -> 422 (Phụ lục A SRS).
            DomainException       => (StatusCodes.Status422UnprocessableEntity, "Không thể xử lý yêu cầu."),
            // Hai người sửa cùng một recipe -> RowVersion không khớp (SRS mục 7.1).
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict,
                "Dữ liệu đã bị người khác thay đổi. Vui lòng tải lại và thử lại."),
            NotImplementedException => (StatusCodes.Status501NotImplemented,
                "Chức năng này chưa được hiện thực."),
            _ => (StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi không mong muốn."),
        };

        if (status >= StatusCodes.Status500InternalServerError &&
            status != StatusCodes.Status501NotImplemented)
        {
            _logger.LogError(exception, "Lỗi chưa được xử lý tại {Path}", httpContext.Request.Path);
        }

        var problem = new ProblemDetails
        {
            Type = "about:blank",
            Title = title,
            Status = status,
            Detail = exception.Message,
            Instance = httpContext.Request.Path,
        };

        // SRS mục 8: lỗi validation kèm chi tiết theo từng field.
        if (exception is ValidationException validationException)
            problem.Extensions["errors"] = validationException.Errors;

        if (exception is ConflictException { ErrorCode: not null } conflict)
            problem.Extensions["errorCode"] = conflict.ErrorCode;

        // Gắn CorrelationId để tra log (FR-OBS-002).
        if (httpContext.Items.TryGetValue("CorrelationId", out var correlationId))
            problem.Extensions["correlationId"] = correlationId;

        httpContext.Response.StatusCode = status;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problem, ct);
        return true;
    }
}
