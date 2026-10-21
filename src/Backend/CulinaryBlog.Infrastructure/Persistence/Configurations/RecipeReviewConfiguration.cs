using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

public sealed class RecipeReviewConfiguration : IEntityTypeConfiguration<RecipeReview>
{
    public void Configure(EntityTypeBuilder<RecipeReview> builder)
    {
        builder.ToTable("RecipeReviews", table =>
            table.HasCheckConstraint("CK_RecipeReviews_Rating", "\"Rating\" BETWEEN 1 AND 5"));
        builder.HasKey(review => review.Id);
        builder.Property(review => review.AuthorId).IsRequired().HasMaxLength(450);
        builder.Property(review => review.Rating).IsRequired();
        builder.Property(review => review.Comment).IsRequired().HasMaxLength(2000);
        builder.Property(review => review.RowVersion).IsRowVersion();

        builder.HasOne(review => review.Recipe)
            .WithMany(recipe => recipe.Reviews)
            .HasForeignKey(review => review.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(review => review.Author)
            .WithMany()
            .HasForeignKey(review => review.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(review => new { review.RecipeId, review.AuthorId })
            .IsUnique()
            .HasDatabaseName("UX_RecipeReviews_Recipe_Author");
        builder.HasIndex(review => new { review.RecipeId, review.CreatedAt })
            .HasDatabaseName("IDX_RecipeReviews_Recipe_CreatedAt");
    }
}
