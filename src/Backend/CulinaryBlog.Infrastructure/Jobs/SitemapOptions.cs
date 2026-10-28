namespace CulinaryBlog.Infrastructure.Jobs;

public class SitemapOptions
{
    public const string JobId = "sitemap-daily";
    public string SiteBaseUrl { get; set; } = "";
    public string OutputDirectory { get; set; } = "public/seo";
    public string Cron { get; set; } = "0 2 * * *";
    public bool SubmitToSearchConsole { get; set; }
    public string? SearchConsoleSiteUrl { get; set; }

    public string ResolveDirectory(string contentRoot) => Path.GetFullPath(OutputDirectory, contentRoot);
    public bool IsValid()
    {
        if (!Uri.TryCreate(SiteBaseUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "https" && uri.Scheme != "http") || uri.UserInfo.Length != 0 ||
            uri.AbsolutePath != "/" || uri.Query.Length != 0 || uri.Fragment.Length != 0 ||
            string.IsNullOrWhiteSpace(OutputDirectory) || string.IsNullOrWhiteSpace(Cron)) return false;
        // Never submit localhost or private development origins to Google.
        return !SubmitToSearchConsole || (uri.Scheme == "https" && !uri.IsLoopback &&
            !System.Net.IPAddress.TryParse(uri.Host, out _) && !uri.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(SearchConsoleSiteUrl));
    }
}
