namespace CulinaryBlog.Application.DTOs;

public record FileUploadDto(string Url, string FileName, string ContentType, long Size);
