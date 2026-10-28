using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CulinaryBlog.Infrastructure.Persistence.Migrations;

[DbContext(typeof(CulinaryBlogDbContext))]
[Migration("20261014090000_EnableUnaccentSearch")]
public class EnableUnaccentSearch : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
        => migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS unaccent;");

    // The extension may be shared by other applications; keep it on rollback.
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Không xóa extension dùng chung khi rollback migration của ứng dụng này.
    }
}
