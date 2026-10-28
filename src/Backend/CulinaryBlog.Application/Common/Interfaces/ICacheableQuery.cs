namespace CulinaryBlog.Application.Common.Interfaces;

public interface ICacheableQuery
{
    TimeSpan CacheDuration { get; }
}
