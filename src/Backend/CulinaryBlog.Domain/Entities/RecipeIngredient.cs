using CulinaryBlog.Domain.Common;

namespace CulinaryBlog.Domain.Entities;

// SRS mục 7.4 - nguyên liệu của công thức.
// Quantity và Unit nullable vì có loại "nguyên liệu vừa đủ" không cần định lượng.
public class RecipeIngredient : BaseEntity
{
    public Guid RecipeId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal? Quantity { get; private set; }
    public string? Unit { get; private set; }
    public string? Notes { get; private set; }
    public int OrderIndex { get; private set; }

    public Recipe? Recipe { get; private set; }

    protected RecipeIngredient() { }

    public static RecipeIngredient Create(Guid recipeId, string name,
        decimal? quantity = null, string? unit = null, string? notes = null, int orderIndex = 0)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        return new RecipeIngredient
        {
            RecipeId = recipeId,
            Name = name.Trim(),
            Quantity = quantity,
            Unit = unit?.Trim(),
            Notes = notes?.Trim(),
            OrderIndex = orderIndex,
        };
    }

    // Cập nhật thông tin nguyên liệu (Tuân thủ Quyết định D10: cho phép Quantity và Unit nhận null)
    public void Update(string? name, decimal? quantity, string? unit, string? notes, int? orderIndex)
    {
        // 1. Tên nguyên liệu bắt buộc không rỗng
        if (!string.IsNullOrWhiteSpace(name)) Name = name.Trim();

        // 2. Định lượng và đơn vị cho phép null khi người dùng chọn nêm nếm vừa đủ (D10)
        Quantity = quantity;
        Unit = string.IsNullOrWhiteSpace(unit) ? null : unit.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();

        // 3. Cập nhật số thứ tự nếu có
        if (orderIndex.HasValue) OrderIndex = orderIndex.Value;

        // 4. Cập nhật thời điểm chỉnh sửa
        Touch();
    }

    // Đánh lại số thứ tự nguyên liệu khi xóa hoặc chèn (FR-RCP-009)
    public void Renumber(int newOrderIndex)
    {
        OrderIndex = newOrderIndex;
        Touch();
    }
}
