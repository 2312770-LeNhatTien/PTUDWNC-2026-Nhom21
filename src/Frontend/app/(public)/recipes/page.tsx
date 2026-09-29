import Link from "next/link";
import { recipesApi } from "@/lib/api/recipes";
import { categoriesApi } from "@/lib/api/categories";
import RecipeCard from "@/components/recipes/RecipeCard";
import type { RecipeDifficulty } from "@/types/api";

interface RecipesPageProps {
  searchParams: Promise<{
    categoryId?: string;
    difficulty?: RecipeDifficulty;
    page?: string;
    q?: string;
  }>;
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const categoryId = params.categoryId;
  const difficulty = params.difficulty;

  // Lấy song song dữ liệu công thức và danh sách danh mục để làm bộ lọc
  const [recipesData, categories] = await Promise.all([
    recipesApi.getAll({
      page,
      pageSize: 12,
      categoryId,
      difficulty,
    }),
    categoriesApi.getAll().catch(() => []),
  ]);

  const { items: recipes, total } = recipesData;

  const difficulties: { label: string; value: RecipeDifficulty }[] = [
    { label: "Dễ", value: "Easy" },
    { label: "Vừa", value: "Medium" },
    { label: "Khó", value: "Hard" },
    { label: "Kỳ công", value: "Expert" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-20">
      {/* ── HEADER BANNER ────────────────────────────────────────── */}
      <section className="bg-white border-b border-neutral-100 py-10 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 mb-3">
            📖 Kho tàng ẩm thực Việt
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
            Khám Phá Công Thức Nấu Ăn
          </h1>
          <p className="mt-3 text-sm sm:text-base text-neutral-600">
            Hàng trăm công thức nấu ăn ngon miệng, hướng dẫn chi tiết từng bước từ cộng đồng đầu bếp gia đình.
          </p>
        </div>
      </section>

      {/* ── FILTER & CONTENT SECTION ─────────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Bộ lọc nhanh theo Danh mục và Độ khó */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 mb-8 shadow-xs space-y-4">
          {/* Lọc theo Danh mục */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-bold text-neutral-700 shrink-0 mr-1">
                Danh mục:
              </span>
              <Link
                href={`/recipes${difficulty ? `?difficulty=${difficulty}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  !categoryId
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                Tất cả
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/recipes?categoryId=${cat.id}${difficulty ? `&difficulty=${difficulty}` : ""}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    categoryId === cat.id
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {cat.name} ({cat.recipeCount})
                </Link>
              ))}
            </div>
          )}

          {/* Lọc theo Độ khó */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-neutral-100">
            <span className="text-xs font-bold text-neutral-700 shrink-0 mr-1">
              Độ khó:
            </span>
            <Link
              href={`/recipes${categoryId ? `?categoryId=${categoryId}` : ""}`}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                !difficulty
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Mọi cấp độ
            </Link>
            {difficulties.map((diff) => (
              <Link
                key={diff.value}
                href={`/recipes?difficulty=${diff.value}${categoryId ? `&categoryId=${categoryId}` : ""}`}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  difficulty === diff.value
                    ? "bg-neutral-800 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {diff.label}
              </Link>
            ))}

            {(categoryId || difficulty) && (
              <Link
                href="/recipes"
                className="ml-auto text-xs text-orange-600 font-semibold hover:underline shrink-0"
              >
                ✕ Xóa bộ lọc
              </Link>
            )}
          </div>
        </div>

        {/* Thông tin số lượng món tìm thấy */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs sm:text-sm text-neutral-500 font-medium">
            Tìm thấy <span className="font-bold text-neutral-900">{total}</span> công thức món ngon
          </p>
          <Link
            href="/dashboard/recipes/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            + Viết công thức mới
          </Link>
        </div>

        {/* Lưới danh sách món ăn RecipeCard */}
        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center my-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 mb-4 text-2xl">
              🍳
            </div>
            <h3 className="text-lg font-bold text-neutral-800">
              Không tìm thấy công thức nào phù hợp
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500">
              Hãy thử chọn danh mục hoặc mức độ khó khác, hoặc trở thành người đầu tiên chia sẻ món này!
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/recipes"
                className="inline-flex items-center rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                Xem tất cả món ăn
              </Link>
              <Link
                href="/dashboard/recipes/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
              >
                + Đăng công thức
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}