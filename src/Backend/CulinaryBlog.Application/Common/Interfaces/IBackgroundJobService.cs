using System.Linq.Expressions;

namespace CulinaryBlog.Application.Common.Interfaces;

/// <summary>
/// Abstraction cho hệ thống chạy tác vụ nền (Background Jobs).
/// Cho phép các Command trong tầng Application kích hoạt tác vụ nền
/// mà không bị phụ thuộc trực tiếp vào thư viện Hangfire cụ thể.
/// </summary>
public interface IBackgroundJobService
{
    string Enqueue<T>(Expression<Func<T, Task>> methodCall);
    string Enqueue<T>(Expression<Action<T>> methodCall);
}
