using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

// SRS mục 7.8 - lưu SHA-256 hash của token, không lưu raw token.
public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");
        builder.HasKey(rt => rt.Id);

        builder.Property(rt => rt.TokenHash).IsRequired().HasMaxLength(64);
        builder.Property(rt => rt.ReplacedByTokenHash).HasMaxLength(64);
        // UPDATE có điều kiện RevokedAt cũ: hai refresh không thể cùng tiêu thụ một token.
        builder.Property(rt => rt.RevokedAt).IsConcurrencyToken();
        builder.Property(rt => rt.CreatedByIp).HasMaxLength(45); // đủ cho IPv6

        builder.HasIndex(rt => rt.TokenHash)
            .IsUnique()
            .HasDatabaseName("IDX_RefreshToken_Hash");
        builder.HasIndex(rt => rt.UserId);

        builder.HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
