using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Common.Interfaces;
using CulinaryBlog.Application.DTOs;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Features.Files.Commands.UploadFile;

// Stream giữ Application độc lập với IFormFile/HTTP của tầng API.
public record UploadFileCommand(Stream Content, string FileName, string ContentType, string Folder, long Size)
    : IRequest<FileUploadDto>;

public class UploadFileCommandValidator : AbstractValidator<UploadFileCommand>
{
    public UploadFileCommandValidator()
    {
        RuleFor(x => x.Size).GreaterThan(0).LessThanOrEqualTo(5 * 1024 * 1024)
            .WithMessage("Ảnh phải lớn hơn 0 và tối đa 5 MB.");
        RuleFor(x => x.ContentType).NotEmpty();
    }
}

public class UploadFileCommandHandler(IFileStorageService storage, ICurrentUser user)
    : IRequestHandler<UploadFileCommand, FileUploadDto>
{
    public async Task<FileUploadDto> Handle(UploadFileCommand request, CancellationToken cancellationToken)
    {
        if (!user.IsAuthenticated) throw new UnauthorizedException("Vui lòng đăng nhập trước khi tải ảnh.");
        var url = await storage.UploadAsync(request.Content, request.FileName, request.ContentType, request.Folder, cancellationToken);
        return new FileUploadDto(url, request.FileName, request.ContentType, request.Size);
    }
}
