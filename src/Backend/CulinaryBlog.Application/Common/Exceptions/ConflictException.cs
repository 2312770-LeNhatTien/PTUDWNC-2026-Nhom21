namespace CulinaryBlog.Application.Common.Exceptions;

// HTTP 409 - vd: trùng email khi đăng ký, trùng tên danh mục,
// hoặc xóa danh mục còn công thức bên trong.
public class ConflictException : Exception
{
    public string? ErrorCode { get; }
    public ConflictException(string message, string? errorCode = null) : base(message) => ErrorCode = errorCode;
}
