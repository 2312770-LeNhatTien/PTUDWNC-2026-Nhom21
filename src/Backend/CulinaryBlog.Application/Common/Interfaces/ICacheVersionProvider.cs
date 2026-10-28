namespace CulinaryBlog.Application.Common.Interfaces;

public interface ICacheVersionProvider
{
    Task<string> GetAsync(CancellationToken ct);
}
