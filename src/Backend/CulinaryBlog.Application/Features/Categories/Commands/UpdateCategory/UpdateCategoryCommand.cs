using CulinaryBlog.Application.DTOs;
using MediatR;
using System.Text.Json.Serialization;

namespace CulinaryBlog.Application.Features.Categories.Commands.UpdateCategory;

public record UpdateCategoryCommand(
    string Name,
    string? Description = null,
    string? ImageUrl = null,
    int? OrderIndex = null
) : IRequest<CategoryDto>
{
    [JsonIgnore]
    public Guid Id { get; set; }
}
