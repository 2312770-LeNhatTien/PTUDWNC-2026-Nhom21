using System.Collections.Concurrent;
using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using Moq;

namespace CulinaryBlog.Tests;

// Chỉ thay transport S3; API vẫn chạy service thật để test MIME/bytes/key/owner.
internal static class TestObjectStorage
{
    public static IAmazonS3 Create()
    {
        var objects = new ConcurrentDictionary<(string, string), (byte[] Bytes, string Type)>();
        var client = new Mock<IAmazonS3>();
        client.Setup(s => s.ListBucketsAsync(It.IsAny<ListBucketsRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ListBucketsResponse());
        client.Setup(s => s.GetBucketLocationAsync(It.IsAny<GetBucketLocationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GetBucketLocationResponse { HttpStatusCode = HttpStatusCode.OK });
        client.Setup(s => s.PutBucketAsync(It.IsAny<PutBucketRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PutBucketResponse());
        client.Setup(s => s.PutBucketPolicyAsync(It.IsAny<PutBucketPolicyRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PutBucketPolicyResponse());
        client.Setup(s => s.PutObjectAsync(It.IsAny<PutObjectRequest>(), It.IsAny<CancellationToken>()))
            .Returns(async (PutObjectRequest request, CancellationToken ct) =>
            {
                using var bytes = new MemoryStream(); await request.InputStream.CopyToAsync(bytes, ct);
                objects[(request.BucketName, request.Key)] = (bytes.ToArray(), request.ContentType);
                return new PutObjectResponse();
            });
        client.Setup(s => s.GetObjectMetadataAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string bucket, string key, CancellationToken _) =>
                objects.TryGetValue((bucket, key), out var value)
                    ? new GetObjectMetadataResponse { ContentLength = value.Bytes.Length }
                    : throw new AmazonS3Exception("Not found") { StatusCode = HttpStatusCode.NotFound });
        client.Setup(s => s.GetObjectAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string bucket, string key, CancellationToken _) =>
            {
                if (!objects.TryGetValue((bucket, key), out var value))
                    throw new AmazonS3Exception("Not found") { StatusCode = HttpStatusCode.NotFound };
                var response = new GetObjectResponse { ResponseStream = new MemoryStream(value.Bytes), ContentLength = value.Bytes.Length };
                response.Headers.ContentType = value.Type; return response;
            });
        client.Setup(s => s.DeleteObjectAsync(It.IsAny<DeleteObjectRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DeleteObjectRequest request, CancellationToken cancellation) =>
            { objects.TryRemove((request.BucketName, request.Key), out _); return new DeleteObjectResponse(); });
        return client.Object;
    }
}
