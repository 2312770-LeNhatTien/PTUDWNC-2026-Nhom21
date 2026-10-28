using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

public class PendingJobConfiguration : IEntityTypeConfiguration<PendingJob>
{
    public void Configure(EntityTypeBuilder<PendingJob> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Kind).HasMaxLength(30);
        builder.Property(x => x.UserId).HasMaxLength(450);
        builder.Property(x => x.FileUrl).HasMaxLength(1000);
        builder.Property(x => x.HangfireJobId).HasMaxLength(100);
        builder.HasIndex(x => new { x.CompletedAt, x.HangfireJobId });
        builder.HasIndex(x => x.UserId).IsUnique().HasFilter("\"Kind\" = 'welcome'");
    }
}
