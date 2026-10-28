namespace CulinaryBlog.Application.Common.Models;

// D8: explicit sortBy/sortOrder takes precedence over shorthand sort=-createdAt.
public record PagingParams
{
    private int _pageSize = 12;
    private int _page = 1;
    private string? _sortBy;
    private string? _sortOrder;

    public int? Page
    {
        get => _page;
        init => _page = value is > 0 ? value.Value : 1;
    }
    public int? PageSize
    {
        get => _pageSize;
        init => _pageSize = value is > 0 ? Math.Min(value.Value, 50) : 12;
    }
    public string? Sort { get; init; }
    public string? SortBy
    {
        get => !string.IsNullOrWhiteSpace(_sortBy) ? _sortBy : Sort?.TrimStart('-');
        init => _sortBy = value;
    }
    public string? SortOrder
    {
        get
        {
            if (!string.IsNullOrWhiteSpace(_sortOrder)) return _sortOrder;
            return !string.IsNullOrWhiteSpace(Sort) && !Sort.StartsWith('-') ? "asc" : "desc";
        }
        init => _sortOrder = value;
    }
    public bool IsDescending => !string.Equals(SortOrder, "asc", StringComparison.OrdinalIgnoreCase);
}
