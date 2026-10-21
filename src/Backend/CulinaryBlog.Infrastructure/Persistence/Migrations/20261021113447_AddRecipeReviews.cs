using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CulinaryBlog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRecipeReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RecipeReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecipeReviews", x => x.Id);
                    table.CheckConstraint("CK_RecipeReviews_Rating", "\"Rating\" BETWEEN 1 AND 5");
                    table.ForeignKey(
                        name: "FK_RecipeReviews_AspNetUsers_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RecipeReviews_Recipes_RecipeId",
                        column: x => x.RecipeId,
                        principalTable: "Recipes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IDX_RecipeReviews_Recipe_CreatedAt",
                table: "RecipeReviews",
                columns: new[] { "RecipeId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_RecipeReviews_AuthorId",
                table: "RecipeReviews",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "UX_RecipeReviews_Recipe_Author",
                table: "RecipeReviews",
                columns: new[] { "RecipeId", "AuthorId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecipeReviews");
        }
    }
}
