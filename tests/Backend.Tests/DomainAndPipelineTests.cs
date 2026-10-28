using CulinaryBlog.Application.Common.Behaviors;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.Common.Models;
using CulinaryBlog.Application.Features.Categories.Queries.GetCategories;
using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Infrastructure.Caching;
using CulinaryBlog.Infrastructure.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StackExchange.Redis;

namespace CulinaryBlog.Tests;

public sealed class DomainAndPipelineTests
{
    [Theory]
    [InlineData("archive")] [InlineData("unpublish")]
    public void Published_slug_stays_frozen_after_status_changes(string transition)
    {
        var recipe = Recipe.Create("Phở bò", "Món Việt", "Nấu kỹ", Guid.NewGuid(), "owner", 10, 20, 2, RecipeDifficulty.Easy);
        Assert.Throws<DomainException>(recipe.Publish);
        recipe.Steps.Add(RecipeStep.Create(recipe.Id, 1, "Nấu", "Đun sôi"));
        Assert.Throws<DomainException>(recipe.Publish);
        recipe.Ingredients.Add(RecipeIngredient.Create(recipe.Id, "Muối", null, null));
        recipe.Publish(); var slug = recipe.Slug;
        if (transition == "archive") recipe.Archive(); else recipe.Unpublish();
        recipe.UpdateDetails("Bún mới", null, null, null, null, null, null, null);
        Assert.Equal(slug, recipe.Slug);
    }

    [Theory]
    [InlineData(null, 12)] [InlineData(0, 12)] [InlineData(51, 50)] [InlineData(1, 1)]
    public void Paging_uses_SRS_limits_and_D8_sort(int? size, int expected)
    {
        var paging = new PagingParams { Page = -2, PageSize = size, Sort = "-prepTime" };
        Assert.Equal(1, paging.Page); Assert.Equal(expected, paging.PageSize);
        Assert.Equal("prepTime", paging.SortBy); Assert.True(paging.IsDescending);
        var explicitSort = paging with { SortBy = "title", SortOrder = "asc" };
        Assert.Equal("title", explicitSort.SortBy); Assert.False(explicitSort.IsDescending);
    }

    [Fact]
    public async Task Redis_outage_falls_back_without_turning_a_successful_write_into_error()
    {
        var distributed = new Mock<IDistributedCache>();
        distributed.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new RedisConnectionException(ConnectionFailureType.UnableToConnect, "offline"));
        var cache = new RedisCacheService(distributed.Object, Mock.Of<IConnectionMultiplexer>(), NullLogger<RedisCacheService>.Instance);
        Assert.Null(await cache.GetAsync<string>("public:test"));
        await cache.SetAsync("public:test", "saved", TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task Pipeline_cache_changes_key_with_durable_version_and_bypasses_signed_in_user()
    {
        var cache = new MemoryTestCache(); var versions = new TestVersion(); var user = new TestUser();
        var pipeline = new CachingBehavior<GetCategoriesQuery, string>(cache, versions, user,
            NullLogger<CachingBehavior<GetCategoriesQuery, string>>.Instance);
        var calls = 0;
        Task<string> Next() => Task.FromResult("result-" + ++calls);
        Assert.Equal("result-1", await pipeline.Handle(new(), Next, default));
        Assert.Equal("result-1", await pipeline.Handle(new(), Next, default));
        versions.Value = "after-write";
        Assert.Equal("result-2", await pipeline.Handle(new(), Next, default));
        user.Authenticated = true;
        Assert.Equal("result-3", await pipeline.Handle(new(), Next, default));
    }

    [Fact]
    public async Task Google_requires_server_client_id_without_contacting_google()
    {
        var validator = new GoogleTokenValidator(new ConfigurationBuilder().Build());
        var error = await Assert.ThrowsAsync<CulinaryBlog.Application.Common.Exceptions.ValidationException>(() => validator.ValidateAsync("bad", default));
        Assert.Contains("GOOGLE_NOT_CONFIGURED", error.Errors.Keys);
    }

    [Theory]
    [InlineData("http://127.0.0.1/internal")]
    [InlineData("http://localhost:9000/another-bucket/image.png")]
    [InlineData("https://attacker.example/culinary-blog/recipe.png")]
    [InlineData("http://localhost:9000/culinary-blog/image.png?redirect=internal")]
    public async Task Storage_rejects_unmanaged_urls_before_S3_or_HTTP(string url)
    {
        var s3 = new Mock<Amazon.S3.IAmazonS3>(MockBehavior.Strict);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["MinIO:Endpoint"] = "localhost:9000" }).Build();
        var storage = new MinioFileStorageService(s3.Object, config, NullLogger<MinioFileStorageService>.Instance, new TestUser());
        await Assert.ThrowsAsync<CulinaryBlog.Application.Common.Exceptions.ValidationException>(() => storage.DownloadFileAsync(url));
        s3.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Attach_missing_owned_object_returns_validation_instead_of_internal_error()
    {
        var user = new TestUser { Authenticated = true };
        var s3 = new Mock<Amazon.S3.IAmazonS3>();
        s3.Setup(x => x.GetObjectMetadataAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Amazon.S3.AmazonS3Exception("NoSuchKey") { StatusCode = System.Net.HttpStatusCode.NotFound });
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["MinIO:Endpoint"] = "localhost:9000" }).Build();
        var storage = new MinioFileStorageService(s3.Object, config, NullLogger<MinioFileStorageService>.Instance, user);
        var error = await Assert.ThrowsAsync<CulinaryBlog.Application.Common.Exceptions.ValidationException>(() =>
            storage.EnsureOwnedUploadAsync($"http://localhost:9000/culinary-blog/users/{user.UserId}/recipes/{Guid.NewGuid():N}.png"));
        Assert.Contains("FILE_NOT_FOUND", error.Errors.Keys);
    }
}

internal sealed class TestUser : ICurrentUser
{
    public bool Authenticated { get; set; }
    public string? UserId { get; set; } = Guid.NewGuid().ToString();
    public string? Email => "test@example.test";
    public bool IsAuthenticated => Authenticated;
    public bool IsAdmin { get; set; }
    public IReadOnlyList<string> Roles => IsAdmin ? ["Admin"] : ["Author"];
}
internal sealed class TestVersion : ICacheVersionProvider
{
    public string Value { get; set; } = "initial";
    public Task<string> GetAsync(CancellationToken ct) => Task.FromResult(Value);
}
internal sealed class MemoryTestCache : ICacheService
{
    private readonly Dictionary<string, object?> _items = new();
    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) => Task.FromResult(_items.TryGetValue(key, out var value) ? (T?)value : default);
    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default) { _items[key] = value; return Task.CompletedTask; }
    public Task RemoveAsync(string key, CancellationToken ct = default) { _items.Remove(key); return Task.CompletedTask; }
    public Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default) => Task.CompletedTask;
}
