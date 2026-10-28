using System.Linq.Expressions;
using CulinaryBlog.Application.Common.Interfaces;

namespace CulinaryBlog.Infrastructure.Services;

public sealed class DisabledBackgroundJobService : IBackgroundJobService
{
    public string Enqueue<T>(Expression<Func<T, Task>> methodCall) => throw new InvalidOperationException("Jobs đang tắt; công việc tự động vẫn được lưu chờ.");
    public string Enqueue<T>(Expression<Action<T>> methodCall) => throw new InvalidOperationException("Jobs đang tắt.");
}
