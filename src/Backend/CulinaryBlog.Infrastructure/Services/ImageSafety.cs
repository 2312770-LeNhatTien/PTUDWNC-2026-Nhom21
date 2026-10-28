using CulinaryBlog.Application.Common.Exceptions;
using ImageMagick;

namespace CulinaryBlog.Infrastructure.Services;

internal static class ImageSafety
{
    static ImageSafety()
    {
        // Giới hạn native decoder trước khi đọc ảnh, tránh ảnh nén nhỏ chiếm RAM/CPU lớn.
        ResourceLimits.Memory = 128 * 1024 * 1024;
        ResourceLimits.MaxMemoryRequest = 128 * 1024 * 1024;
        ResourceLimits.MaxProfileSize = 1024 * 1024;
        ResourceLimits.ListLength = 16;
        ResourceLimits.Disk = 0;
        ResourceLimits.Area = 25_000_000;
        ResourceLimits.Width = 10000;
        ResourceLimits.Height = 10000;
        ResourceLimits.Thread = 2;
        ResourceLimits.Time = 30;
    }

    public static MagickImage ReadVerified(Stream stream, string? declaredType = null)
    {
        MagickImage? image = null;
        try
        {
            image = new MagickImage(stream, new MagickReadSettings { FrameCount = 1 });
            var mime = image.Format switch
            {
                MagickFormat.Jpeg => "image/jpeg",
                MagickFormat.Png => "image/png",
                MagickFormat.WebP => "image/webp",
                MagickFormat.Avif => "image/avif",
                _ => ""
            };
            if (mime == "" || (declaredType != null && !mime.Equals(declaredType, StringComparison.OrdinalIgnoreCase)) ||
                (ulong)image.Width * image.Height > 25_000_000)
                throw new ValidationException("FILE_FORMAT_INVALID", "Định dạng hoặc độ phân giải ảnh không hợp lệ.");
            image.AutoOrient();
            image.Strip();
            return image;
        }
        catch (MagickException)
        {
            image?.Dispose();
            throw new ValidationException("FILE_CORRUPTED", "Không đọc được ảnh hoặc ảnh vượt giới hạn xử lý.");
        }
        catch { image?.Dispose(); throw; }
    }
}
