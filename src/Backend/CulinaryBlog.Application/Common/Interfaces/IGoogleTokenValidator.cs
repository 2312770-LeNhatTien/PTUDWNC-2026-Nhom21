namespace CulinaryBlog.Application.Common.Interfaces;

public record GoogleIdentity(string Subject, string Email, string? Name, string? Picture);

public interface IGoogleTokenValidator
{
    Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken ct);
}
