using System.Net;
using System.Reflection;
using System.Xml.Linq;
using CulinaryBlog.Application.Features.Seo.Queries.GetSitemapEntries;
using CulinaryBlog.Infrastructure.Jobs;
using Google.Apis.Auth.OAuth2;
using Hangfire;
using Hangfire.PostgreSql;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

// No worker is started. Only the distributed lock uses the isolated test database.
var connection = Environment.GetEnvironmentVariable("SITEMAP_TEST_CONNECTION")
    ?? "Host=localhost;Port=5432;Database=culinary_blog_lab7_20261021;Username=postgres;Password=postgres";
GlobalConfiguration.Configuration.UsePostgreSqlStorage(pg => pg.UseNpgsqlConnection(connection));
var handler = new EntriesHandler();
var services = new ServiceCollection().AddMediatR(c => c.RegisterServicesFromAssemblyContaining<GetSitemapEntriesQuery>());
services.AddSingleton<IRequestHandler<GetSitemapEntriesQuery, IReadOnlyList<SitemapEntry>>>(handler);
using var provider = services.BuildServiceProvider();
var directory = Path.Combine(Path.GetTempPath(), "culinary-sitemap-checks-" + Guid.NewGuid().ToString("N"));
var options = new SitemapOptions { SiteBaseUrl = "https://example.com", OutputDirectory = directory };
var http = new RecordingHttp();
var job = new SitemapJob(provider.GetRequiredService<ISender>(), Options.Create(options), new TestEnvironment(),
    JobStorage.Current, http, NullLogger<SitemapJob>.Instance, GoogleCredential.FromAccessToken("test-token"));
void Check(bool value, string message) { if (!value) throw new Exception(message); Console.WriteLine("PASS: " + message); }
var file = Path.Combine(directory, "sitemap.xml");
var ns = XNamespace.Get("http://www.sitemaps.org/schemas/sitemap/0.9");
try
{
    handler.Entries = [new("/", null), new("/recipes/a&b", new DateTime(2026, 10, 20, 0, 0, 0, DateTimeKind.Utc)),
        new("/recipes/a&b", new DateTime(2026, 10, 21, 0, 0, 0, DateTimeKind.Utc)), new("/recipes/c%C3%A1", null)];
    await job.RunAsync(default);
    var doc = XDocument.Load(file);
    Check(doc.Root!.Name == ns + "urlset" && doc.Root.Elements(ns + "url").Count() == 3, "XML namespace and duplicate removal");
    var item = doc.Root.Elements(ns + "url").Single(e => e.Element(ns + "loc")!.Value.Contains("a&b"));
    Check(item.Element(ns + "lastmod")!.Value == "2026-10-21T00:00:00Z", "XML escaping and newest actual lastmod");
    Check(doc.Root.Elements(ns + "url").First().Element(ns + "lastmod") is null, "no fabricated lastmod on static pages");
    Check(http.Calls == 0, "Google submission disabled locally");
    var before = await File.ReadAllTextAsync(file);
    handler.Fail = true;
    try { await job.RunAsync(default); throw new Exception("Expected query failure"); } catch (InvalidOperationException) { }
    Check(await File.ReadAllTextAsync(file) == before, "query failure preserves previous valid sitemap");
    handler.Fail = false;
    using var cancelled = new CancellationTokenSource(); cancelled.Cancel();
    try { await job.RunAsync(cancelled.Token); throw new Exception("Expected cancellation"); } catch (OperationCanceledException) { }
    Check(await File.ReadAllTextAsync(file) == before && !Directory.EnumerateFiles(directory, "*.tmp").Any(), "cancellation preserves file and cleans temporary files");
    if (OperatingSystem.IsWindows())
    {
        using (var reader = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            try { await job.RunAsync(default); throw new Exception("Expected replacement failure"); }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
        }
        Check(await File.ReadAllTextAsync(file) == before && !Directory.EnumerateFiles(directory, "*.tmp").Any(), "filesystem replacement failure preserves valid XML and cleans temporary files");
    }
    var original = handler.Entries;
    handler.Entries = Enumerable.Range(0, 50_001).Select(i => new SitemapEntry("/recipes/" + i, null)).ToList();
    try { await job.RunAsync(default); throw new Exception("Expected size rejection"); } catch (InvalidOperationException) { }
    Check(await File.ReadAllTextAsync(file) == before, "oversized sitemap rejected without replacing valid file");
    handler.Entries = original;
    await Task.WhenAll(Task.Run(() => job.RunAsync(default)), Task.Run(() => job.RunAsync(default)));
    Check(XDocument.Load(file).Root!.Elements(ns + "url").Count() == 3, "concurrent runs serialized by PostgreSQL lock");
    options.SubmitToSearchConsole = true;
    options.SearchConsoleSiteUrl = "sc-domain:example.com";
    await job.RunAsync(default);
    Check(http.Calls == 1 && http.Method == HttpMethod.Put && http.Target!.Contains("sc-domain%3Aexample.com/sitemaps/https%3A%2F%2Fexample.com%2Fsitemap.xml")
        && http.Authorization == "Bearer test-token", "authenticated current Search Console submit API (mock HTTP)");
    http.Status = HttpStatusCode.ServiceUnavailable;
    try { await job.RunAsync(default); throw new Exception("Expected Google failure"); } catch (HttpRequestException) { }
    Check(XDocument.Load(file).Root!.Name == ns + "urlset", "Google failure is retryable and retains generated XML");
    Check(typeof(SitemapJob).GetMethod(nameof(SitemapJob.RunAsync))!.GetCustomAttribute<AutomaticRetryAttribute>()!.Attempts == 2, "SRS retry count is two");
    options.SiteBaseUrl = "https://localhost";
    Check(!options.IsValid(), "reject Google submission for localhost");
}
finally
{
    if (Directory.Exists(directory) && Path.GetDirectoryName(Path.GetFullPath(directory)) == Path.TrimEndingDirectorySeparator(Path.GetTempPath()))
        Directory.Delete(directory, true);
}

sealed class EntriesHandler : IRequestHandler<GetSitemapEntriesQuery, IReadOnlyList<SitemapEntry>>
{
    public IReadOnlyList<SitemapEntry> Entries { get; set; } = [];
    public bool Fail { get; set; }
    public Task<IReadOnlyList<SitemapEntry>> Handle(GetSitemapEntriesQuery request, CancellationToken ct)
        => Fail ? throw new InvalidOperationException("Simulated query failure") : Task.FromResult(Entries);
}
sealed class TestEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Development";
    public string ApplicationName { get; set; } = "SitemapChecks";
    public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
sealed class RecordingHttp : HttpMessageHandler, IHttpClientFactory
{
    public int Calls;
    public string? Target, Authorization;
    public HttpMethod? Method;
    public HttpStatusCode Status = HttpStatusCode.NoContent;
    public HttpClient CreateClient(string name) => new(this, disposeHandler: false);
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        Calls++; Target = request.RequestUri!.AbsoluteUri; Method = request.Method; Authorization = request.Headers.Authorization?.ToString();
        return Task.FromResult(new HttpResponseMessage(Status));
    }
}
