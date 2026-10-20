using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CulinaryBlog.Infrastructure.Persistence.Migrations;

[DbContext(typeof(CulinaryBlogDbContext))]
[Migration("20261014120000_RecipeConcurrency")]
public class RecipeConcurrency : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        UPDATE "Recipes" SET "RowVersion" = uuid_send(gen_random_uuid())
        WHERE "RowVersion" IS NULL OR octet_length("RowVersion") <> 16;

        CREATE FUNCTION culinary_recipe_version() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            NEW."RowVersion" := uuid_send(gen_random_uuid());
            IF TG_OP = 'INSERT' THEN
                IF NEW."CreatedAt" IS NULL OR NEW."CreatedAt" = '-infinity'::timestamptz THEN
                    NEW."CreatedAt" := clock_timestamp();
                END IF;
            ELSE
                NEW."UpdatedAt" := clock_timestamp();
            END IF;
            RETURN NEW;
        END $$;
        CREATE TRIGGER "TR_Recipes_Version" BEFORE INSERT OR UPDATE ON "Recipes"
        FOR EACH ROW EXECUTE FUNCTION culinary_recipe_version();

        ALTER TABLE "Recipes" ADD CONSTRAINT "CK_Recipes_Version"
        CHECK ("RowVersion" IS NOT NULL AND octet_length("RowVersion") = 16);

        CREATE FUNCTION culinary_recipe_child_changed() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF TG_OP IN ('DELETE', 'UPDATE') THEN
                UPDATE "Recipes" SET "UpdatedAt" = clock_timestamp() WHERE "Id" = OLD."RecipeId";
            END IF;
            IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW."RecipeId" IS DISTINCT FROM OLD."RecipeId") THEN
                UPDATE "Recipes" SET "UpdatedAt" = clock_timestamp() WHERE "Id" = NEW."RecipeId";
            END IF;
            RETURN NULL;
        END $$;
        CREATE TRIGGER "TR_RecipeSteps_Version" AFTER INSERT OR UPDATE OR DELETE ON "RecipeSteps"
        FOR EACH ROW EXECUTE FUNCTION culinary_recipe_child_changed();
        CREATE TRIGGER "TR_RecipeIngredients_Version" AFTER INSERT OR UPDATE OR DELETE ON "RecipeIngredients"
        FOR EACH ROW EXECUTE FUNCTION culinary_recipe_child_changed();
        CREATE TRIGGER "TR_RecipeImages_Version" AFTER INSERT OR UPDATE OR DELETE ON "RecipeImages"
        FOR EACH ROW EXECUTE FUNCTION culinary_recipe_child_changed();
        """);

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        DROP TRIGGER "TR_RecipeSteps_Version" ON "RecipeSteps";
        DROP TRIGGER "TR_RecipeIngredients_Version" ON "RecipeIngredients";
        DROP TRIGGER "TR_RecipeImages_Version" ON "RecipeImages";
        DROP FUNCTION culinary_recipe_child_changed();
        ALTER TABLE "Recipes" DROP CONSTRAINT "CK_Recipes_Version";
        DROP TRIGGER "TR_Recipes_Version" ON "Recipes";
        DROP FUNCTION culinary_recipe_version();
        """);
}
