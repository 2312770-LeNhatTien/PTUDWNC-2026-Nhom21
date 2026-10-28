using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

// SRS mục 7.2 - cấu hình bảng "Recipes".
public class RecipeConfiguration : IEntityTypeConfiguration<Recipe>
{
    public void Configure(EntityTypeBuilder<Recipe> builder)
    {
        builder.ToTable("Recipes");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Title).IsRequired().HasMaxLength(200);
        builder.Property(r => r.Slug).IsRequired().HasMaxLength(220);
        builder.Property(r => r.Description).IsRequired().HasColumnType("text");
        builder.Property(r => r.Instructions).IsRequired().HasColumnType("text");

        // SRS mục 7.2: enum lưu dạng smallint (1=Easy... / 0=Draft...).
        builder.Property(r => r.Difficulty)
            .HasConversion<short>()
            .HasDefaultValue(Domain.Enums.RecipeDifficulty.Easy);
        builder.Property(r => r.Status)
            .HasConversion<short>()
            .HasDefaultValue(Domain.Enums.RecipeStatus.Draft);

        // CHECK constraints theo SRS mục 7.2
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Recipes_PrepTime", "\"PrepTime\" > 0");
            t.HasCheckConstraint("CK_Recipes_CookTime", "\"CookTime\" >= 0");
            t.HasCheckConstraint("CK_Recipes_Servings", "\"Servings\" > 0");
        });

        // Owned Entity - các cột nhúng vào bảng Recipes với tiền tố "Nutrition_"
        builder.OwnsOne(r => r.Nutrition, n =>
        {
            n.Property(x => x.Calories).HasColumnName("Nutrition_Calories").HasColumnType("decimal(8,2)");
            n.Property(x => x.Protein).HasColumnName("Nutrition_Protein").HasColumnType("decimal(8,2)");
            n.Property(x => x.Carbohydrates).HasColumnName("Nutrition_Carbohydrates").HasColumnType("decimal(8,2)");
            n.Property(x => x.Fat).HasColumnName("Nutrition_Fat").HasColumnType("decimal(8,2)");
            n.Property(x => x.Fiber).HasColumnName("Nutrition_Fiber").HasColumnType("decimal(8,2)");
            n.Property(x => x.Sodium).HasColumnName("Nutrition_Sodium").HasColumnType("decimal(8,2)");
        });

        builder.Property(r => r.RowVersion).IsRowVersion();

        builder.HasOne(r => r.Category)
            .WithMany(c => c.Recipes)
            .HasForeignKey(r => r.CategoryId)
            .OnDelete(DeleteBehavior.Restrict); // không xóa danh mục còn công thức

        builder.HasOne(r => r.Author)
            .WithMany(u => u.Recipes)
            .HasForeignKey(r => r.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.Steps)
            .WithOne(s => s.Recipe)
            .HasForeignKey(s => s.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.Ingredients)
            .WithOne(i => i.Recipe)
            .HasForeignKey(i => i.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.Images)
            .WithOne(i => i.Recipe)
            .HasForeignKey(i => i.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Index theo SRS mục 7.2
        builder.HasIndex(r => r.Slug).IsUnique().HasDatabaseName("IDX_Recipe_Slug");
        builder.HasIndex(r => r.CategoryId).HasDatabaseName("IDX_Recipe_CategoryId");
        builder.HasIndex(r => r.AuthorId).HasDatabaseName("IDX_Recipe_AuthorId");
        builder.HasIndex(r => r.Status).HasDatabaseName("IDX_Recipe_Status");
        builder.HasIndex(r => r.Difficulty).HasDatabaseName("IDX_Recipe_Difficulty");
        builder.HasIndex(r => r.PublishedAt).HasDatabaseName("IDX_Recipe_PublishedAt");
        builder.HasIndex(r => r.IsDeleted).HasDatabaseName("IDX_Recipe_IsDeleted");
        // Shadow property giữ kiểu PostgreSQL ở Infrastructure, Domain không phụ thuộc Npgsql.
        builder.Property<NpgsqlTypes.NpgsqlTsVector>("SearchVector").HasColumnType("tsvector")
            .HasDefaultValueSql("''::tsvector").ValueGeneratedOnAddOrUpdate();
        builder.HasIndex("SearchVector").HasMethod("GIN").HasDatabaseName("IDX_Recipe_SearchVector");

        // Migration PreLab8Reliability tạo trigger weighted tsvector có unaccent.
    }
}
