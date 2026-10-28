using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Xml;
using CulinaryBlog.Application.Features.Seo.Queries.GetSitemapEntries;
using Google.Apis.Auth.OAuth2;
using Hangfire;
using MediatR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CulinaryBlog.Infrastructure.Jobs;

// FR-JOB-003: filesystem/Google/Hangfire remain in Infrastructure.
public class SitemapJob(ISender sender, IOptions<SitemapOptions> settings, IHostEnvironment environment,
    JobStorage storage, IHttpClientFactory clients, ILogger<SitemapJob> logger, GoogleCredential? credential = null)
{
    [AutomaticRetry(Attempts = 2)]
    public async Task RunAsync(CancellationToken ct)
    {
        var options = settings.Value;
        using var connection = storage.GetConnection();
        using var fileLock = connection.AcquireDistributedLock("culinary:sitemap-files", TimeSpan.FromSeconds(30));
        logger.LogInformation("Generating sitemap for {Site}", options.SiteBaseUrl);
        var entries = await sender.Send(new GetSitemapEntriesQuery(), ct);
        var urls = entries.Select(e => (Url: new Uri(new Uri(options.SiteBaseUrl), e.Path).AbsoluteUri, e.LastModified))
            .GroupBy(e => e.Url, StringComparer.Ordinal).Select(g => g.OrderByDescending(e => e.LastModified).First()).ToList();
        if (urls.Count > 50_000) throw new InvalidOperationException("Sitemap exceeds 50,000 URLs; a sitemap index is required.");

        var directory = options.ResolveDirectory(environment.ContentRootPath);
        Directory.CreateDirectory(directory);
        var sitemap = Path.Combine(directory, "sitemap.xml");
        var robots = Path.Combine(directory, "robots.txt");
        var xmlTemp = sitemap + "." + Guid.NewGuid().ToString("N") + ".tmp";
        var robotsTemp = robots + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (var stream = new FileStream(xmlTemp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                using var xml = XmlWriter.Create(stream, new XmlWriterSettings { Async = true, Encoding = new UTF8Encoding(false), Indent = true });
                await xml.WriteStartDocumentAsync();
                await xml.WriteStartElementAsync(null, "urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");
                foreach (var entry in urls)
                {
                    ct.ThrowIfCancellationRequested();
                    await xml.WriteStartElementAsync(null, "url", null);
                    await xml.WriteElementStringAsync(null, "loc", null, entry.Url);
                    if (entry.LastModified is { } date)
                        await xml.WriteElementStringAsync(null, "lastmod", null, date.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture));
                    await xml.WriteEndElementAsync();
                }
                await xml.WriteEndElementAsync();
                await xml.WriteEndDocumentAsync();
                await xml.FlushAsync();
            }
            if (new FileInfo(xmlTemp).Length > 50 * 1024 * 1024)
                throw new InvalidOperationException("Sitemap exceeds 50MB; a sitemap index is required.");
            var excluded = new[] { "/admin", "/dashboard", "/profile", "/api/", "/hangfire", "/login", "/register", "/upload-test",
                "/recipes/steps-test", "/recipes/ingredients-test", "/recipes/gallery-test", "/recipes/publish-test" };
            var text = "User-agent: *\nAllow: /\n" + string.Join("\n", excluded.Select(p => "Disallow: " + p)) +
                "\nSitemap: " + new Uri(new Uri(options.SiteBaseUrl), "/sitemap.xml").AbsoluteUri + "\n";
            await File.WriteAllTextAsync(robotsTemp, text, new UTF8Encoding(false), ct);
            ct.ThrowIfCancellationRequested();
            // Both files are completely generated before replacing either public file.
            File.Move(xmlTemp, sitemap, overwrite: true);
            File.Move(robotsTemp, robots, overwrite: true);
            logger.LogInformation("Generated sitemap with {Count} URLs", urls.Count);
        }
        finally
        {
            File.Delete(xmlTemp);
            File.Delete(robotsTemp);
        }

        if (options.SubmitToSearchConsole)
        {
            // API errors fail/retry the job, but never remove a successfully generated file.
            var google = credential ?? await GoogleCredential.GetApplicationDefaultAsync(ct);
            var token = await google.CreateScoped("https://www.googleapis.com/auth/webmasters").UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: ct);
            var sitemapUrl = new Uri(new Uri(options.SiteBaseUrl), "/sitemap.xml").AbsoluteUri;
            var target = "https://www.googleapis.com/webmasters/v3/sites/" + Uri.EscapeDataString(options.SearchConsoleSiteUrl!) +
                "/sitemaps/" + Uri.EscapeDataString(sitemapUrl);
            using var request = new HttpRequestMessage(HttpMethod.Put, target);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var response = await clients.CreateClient("SearchConsole").SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
            logger.LogInformation("Submitted sitemap to Search Console");
        }
        else logger.LogInformation("Search Console submission disabled; sitemap remains publicly available");
    }
}
