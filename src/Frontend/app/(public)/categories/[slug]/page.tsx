import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { categoriesApi } from "@/lib/api/categories";
import RecipeCard from "@/components/recipes/RecipeCard";

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params;

  let categoryData;
  try {
    categoryData = await categoriesApi.getBySlug(slug);
  } catch (err: unknown) {
    const error = err as { response?: { status?: number } };
    if (error?.response?.status === 404) {
      notFound();
    }
    // Trường hợp server lỗi hoặc không kết nối được
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-neutral-800">Không thể tải thông tin danh mục</h2>
        <p className="mt-2 text-neutral-500">Vui lòng thử lại sau hoặc quay về trang chủ.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  const { name, description, imageUrl, recipes } = categoryData;

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-24">
      {/* ── BREADCRUMB ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Link href="/" className="hover:text-orange-600 transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href="/recipes" className="hover:text-orange-600 transition-colors">
              Danh mục
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">{name}</span>
          </nav>
        </div>
      </div>

      {/* ── BANNER HEADER DANH MỤC ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-100/60 via-amber-50/30 to-transparent py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* Ảnh đại diện danh mục */}
            <div className="relative h-36 w-36 sm:h-44 sm:w-44 shrink-0 overflow-hidden rounded-3xl bg-neutral-200 shadow-md border-4 border-white">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-orange-100 text-orange-600 font-bold text-3xl">
                  {name.charAt(0)}
                </div>
              )}
            </div>

            {/* Thông tin mô tả & Badge */}
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-3.5 py-1 text-xs font-semibold text-orange-800">
                <span>🍽️</span> Danh mục món ăn
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900">
                {name}
              </h1>

              {description ? (
                <p className="max-w-2xl text-base text-neutral-600 leading-relaxed">
                  {description}
                </p>
              ) : (
                <p className="text-sm text-neutral-400 italic">
                  Chưa có mô tả chi tiết cho danh mục này.
                </p>
              )}

              <div className="flex items-center gap-4 pt-2 text-sm text-neutral-500 font-medium">
                <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-neutral-200/80 shadow-xs">
                  <span className="font-bold text-orange-600">{recipes.length}</span> công thức nấu
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DANH SÁCH BÀI VIẾT (RECIPE GRID) ──────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              Công thức thuộc danh mục &quot;{name}&quot;
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Khám phá các hướng dẫn nấu ăn chuẩn vị được cộng đồng đóng góp
            </p>
          </div>

          <Link
            href="/recipes"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            ← Khám phá danh mục khác
          </Link>
        </div>

        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          /* EMPTY STATE KHI DANH MỤC CHƯA CÓ BÀI VIẾT */
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center my-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 text-2xl">
              🥘
            </div>
            <h3 className="text-lg font-bold text-neutral-800">
              Chưa có công thức nào trong danh mục này
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500">
              Các đầu bếp đang chuẩn bị những món ngon tuyệt hảo cho chuyên mục này. Hãy quay lại sau hoặc trở thành người đầu tiên chia sẻ!
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/dashboard/recipes/new"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
              >
                + Đăng công thức mới
              </Link>
              <Link
                href="/recipes"
                className="inline-flex items-center rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                Xem danh mục khác
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
