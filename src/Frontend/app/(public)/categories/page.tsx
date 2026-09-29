import { categoriesApi } from "@/lib/api/categories";
import Image from "next/image";
import Link from "next/link";

export default async function CategoriesPage() {
  // Lấy dữ liệu danh mục từ Backend (đã cấu hình api ở lib/api/categories.ts)
  const categories = await categoriesApi.getAll();

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 mb-3">
          🍽️ Chuyên mục ẩm thực
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
          Khám Phá Danh Mục Món Ăn
        </h1>
        <p className="mt-3 text-sm sm:text-base text-neutral-600">
          Duyệt qua các danh mục ẩm thực phong phú mang đậm phong vị quê hương từ truyền thống đến hiện đại.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link href={`/categories/${category.slug}`} key={category.id} className="block group">
            <div className="border border-neutral-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 bg-white h-full flex flex-col hover:border-orange-300">
              {/* Hình ảnh danh mục */}
              {category.imageUrl ? (
                <div className="relative h-48 w-full bg-neutral-100 overflow-hidden">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>
              ) : (
                <div className="h-48 w-full bg-orange-50 flex items-center justify-center text-orange-400 font-bold text-3xl">
                  {category.name.charAt(0)}
                </div>
              )}

              {/* Nội dung text */}
              <div className="p-5 flex flex-col flex-grow">
                <h2 className="text-lg font-bold text-neutral-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
                  {category.name}
                </h2>
                <p className="text-neutral-500 text-xs sm:text-sm mb-4 line-clamp-2 flex-grow leading-relaxed">
                  {category.description || "Chưa có mô tả cho danh mục này."}
                </p>

                {/* Số lượng công thức đã Publish (recipeCount) */}
                <div className="mt-auto pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200/60">
                    {category.recipeCount} công thức
                  </span>
                  <span className="text-xs font-semibold text-orange-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Xem ngay →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
