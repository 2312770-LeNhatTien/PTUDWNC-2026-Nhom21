using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using NpgsqlTypes;

#nullable disable

namespace CulinaryBlog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PreLab8Reliability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Recipes",
                type: "tsvector",
                nullable: true,
                defaultValueSql: "''::tsvector");

            migrationBuilder.CreateTable(
                name: "CacheVersion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Revision = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CacheVersion", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PendingJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ResourceId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: true),
                    FileUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HangfireJobId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PendingJobs", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "CacheVersion",
                columns: new[] { "Id", "Revision" },
                values: new object[] { 1, "initial" });

            migrationBuilder.CreateIndex(
                name: "IDX_Recipe_SearchVector",
                table: "Recipes",
                column: "SearchVector")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "IX_PendingJobs_CompletedAt_HangfireJobId",
                table: "PendingJobs",
                columns: new[] { "CompletedAt", "HangfireJobId" });

            migrationBuilder.CreateIndex(
                name: "IX_PendingJobs_UserId",
                table: "PendingJobs",
                column: "UserId",
                unique: true,
                filter: "\"Kind\" = 'welcome'");

            // unaccent không immutable: trigger lưu vector thay vì generated expression không hợp lệ.
            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION culinary_recipe_search_update() RETURNS trigger AS $$
                BEGIN
                    NEW."SearchVector" :=
                        setweight(to_tsvector('simple', unaccent(coalesce(NEW."Title", ''))), 'A') ||
                        setweight(to_tsvector('simple', unaccent(coalesce(NEW."Description", ''))), 'B');
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                CREATE TRIGGER culinary_recipe_search_update
                    BEFORE INSERT OR UPDATE OF "Title", "Description" ON "Recipes"
                    FOR EACH ROW EXECUTE FUNCTION culinary_recipe_search_update();
                UPDATE "Recipes" SET "SearchVector" =
                    setweight(to_tsvector('simple', unaccent(coalesce("Title", ''))), 'A') ||
                    setweight(to_tsvector('simple', unaccent(coalesce("Description", ''))), 'B');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER IF EXISTS culinary_recipe_search_update ON "Recipes";
                DROP FUNCTION IF EXISTS culinary_recipe_search_update();
                """);
            migrationBuilder.DropTable(
                name: "CacheVersion");

            migrationBuilder.DropTable(
                name: "PendingJobs");

            migrationBuilder.DropIndex(
                name: "IDX_Recipe_SearchVector",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "SearchVector",
                table: "Recipes");
        }
    }
}
