// ============================================================================
// TRANG CHI TIẾT CÔNG THỨC NẤU ĂN (FR-RCP-002)
// Route: /recipes/[slug]
// Kỹ thuật: Next.js 15 Server-Side Rendering (SSR) Server Component
// Thành viên phụ trách: Lê Nhật Tiến (MSSV: 2312770)
// ============================================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { recipesApi } from '@/lib/api/recipes';
import IngredientChecklist from '@/components/recipes/IngredientChecklist';
import type { RecipeDifficulty, RecipeImageDto } from '@/types/api';

interface RecipeDetailPageProps {
  // Trong Next.js 15, params là một Promise cần được await
  params: Promise<{ slug: string }>;
}

// Cấu hình màu sắc và nhãn hiển thị cho từng cấp độ khó
const difficultyMap: Record<
  RecipeDifficulty,
  { label: string; bg: string; text: string; border: string }
> = {
  Easy: {
    label: 'Dễ',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  Medium: {
    label: 'Vừa',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  Hard: {
    label: 'Khó',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  Expert: {
    label: 'Kỳ công',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  // 1. Trích xuất slug từ dynamic route parameter (Next.js 15 async params)
  const { slug } = await params;

  // 2. Gọi trực tiếp API backend thông qua recipesApi.getBySlug (Server Component SSR)
  let recipe;
  try {
    recipe = await recipesApi.getBySlug(slug);
  } catch {
    recipe = null;
  }

  // 3. Nếu không tìm thấy công thức hoặc bị cấm xem (Draft của người khác), trả về 404
  if (!recipe) {
    notFound();
  }

  // Phân tích thời gian và cấu hình độ khó
  const totalTime = recipe.prepTime + recipe.cookTime;
  const diffConfig = difficultyMap[recipe.difficulty] || {
    label: recipe.difficulty,
    bg: 'bg-neutral-50',
    text: 'text-neutral-700',
    border: 'border-neutral-200',
  };

  // Xác định ảnh đại diện chính (ưu tiên isPrimary, nếu không lấy ảnh đầu tiên)
  const primaryImg: RecipeImageDto | undefined =
    recipe.images.find((img) => img.isPrimary) || recipe.images[0];
  const primaryImageUrl =
    primaryImg?.originalUrl ||
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';

  // Định dạng ngày đăng
  const formattedDate = recipe.publishedAt
    ? new Date(recipe.publishedAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-24">
      {/* ── 1. BREADCRUMB ĐIỀU HƯỚNG ──────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <nav className="flex items-center gap-2 text-xs font-medium text-neutral-500 overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-orange-600 transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href="/recipes" className="hover:text-orange-600 transition-colors">
              Công thức
            </Link>
            {recipe.category && (
              <>
                <span>/</span>
                <Link
                  href={`/categories/${recipe.category.slug}`}
                  className="hover:text-orange-600 transition-colors"
                >
                  {recipe.category.name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-neutral-900 font-semibold truncate max-w-xs">
              {recipe.title}
            </span>
          </nav>
        </div>
      </div>

      {/* ── 2. HERO BANNER CHI TIẾT CÔNG THỨC ──────────────────────────── */}
      <section className="bg-white border-b border-neutral-200/60 py-8 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Cột trái: Thông tin tiêu đề, tác giả, huy hiệu */}
            <div className="lg:col-span-7 space-y-4">
              {/* Category & Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                {recipe.category && (
                  <Link
                    href={`/categories/${recipe.category.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-orange-100/80 px-3.5 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-200 transition-colors"
                  >
                    <span>🍽️</span> {recipe.category.name}
                  </Link>
                )}
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${diffConfig.bg} ${diffConfig.text} ${diffConfig.border}`}
                >
                  Độ khó: {diffConfig.label}
                </span>
                {recipe.status === 'Draft' && (
                  <span className="inline-flex items-center rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700">
                    Bản nháp
                  </span>
                )}
              </div>

              {/* Tiêu đề công thức */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                {recipe.title}
              </h1>

              {/* Mô tả ngắn món ăn */}
              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl">
                {recipe.description}
              </p>

              {/* Thông tin tác giả & ngày đăng */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-bold text-base border-2 border-white shadow-2xs">
                  {recipe.author.avatarUrl ? (
                    <img
                      src={recipe.author.avatarUrl}
                      alt={recipe.author.displayName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    recipe.author.displayName?.charAt(0) || 'U'
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900">
                    {recipe.author.displayName}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formattedDate ? `Đăng ngày ${formattedDate}` : 'Đầu bếp cộng đồng'}
                  </p>
                </div>
              </div>

              {/* Thẻ tóm tắt thông số: Chuẩn bị, Nấu, Khẩu phần, Tổng thời gian */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-100">
                <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 text-center">
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                    Chuẩn bị
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 mt-0.5 block">
                    ⏱️ {recipe.prepTime} phút
                  </span>
                </div>

                <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 text-center">
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                    Nấu chín
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 mt-0.5 block">
                    🔥 {recipe.cookTime} phút
                  </span>
                </div>

                <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 text-center">
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                    Tổng cộng
                  </span>
                  <span className="text-base font-extrabold text-orange-600 mt-0.5 block">
                    ⌛ {totalTime} phút
                  </span>
                </div>

                <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 text-center">
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                    Khẩu phần
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 mt-0.5 block">
                    👥 {recipe.servings} người
                  </span>
                </div>
              </div>
            </div>

            {/* Cột phải: Ảnh đại diện lớn của món ăn */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-lg border-4 border-white bg-neutral-100 group">
                <img
                  src={primaryImageUrl}
                  alt={primaryImg?.altText || recipe.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-40" />
                {recipe.images.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-sm">
                    <span>📷</span> {recipe.images.length} hình ảnh
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. KHU VỰC NỘI DUNG CHÍNH (2 CỘT) ─────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* ── CỘT TRÁI (8/12): Hướng dẫn, Timeline các bước nấu, Gallery ── */}
          <div className="lg:col-span-8 space-y-10">
            {/* Lời dẫn / Giới thiệu cách nấu */}
            {recipe.instructions && (
              <section className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
                <h2 className="text-xl font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <span>📖</span> Lời khuyên & Hướng dẫn chung
                </h2>
                <div className="text-sm sm:text-base text-neutral-700 leading-relaxed whitespace-pre-line">
                  {recipe.instructions}
                </div>
              </section>
            )}

            {/* ── TIMELINE CÁC BƯỚC THỰC HIỆN ── */}
            <section className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                    <span>🍳</span> Các bước thực hiện
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Thực hiện tuần tự từng bước để đạt được hương vị chuẩn nhất
                  </p>
                </div>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
                  Tổng {recipe.steps.length} bước
                </span>
              </div>

              {recipe.steps.length > 0 ? (
                <div className="mt-8 space-y-8 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-orange-100 before:hidden sm:before:block">
                  {recipe.steps.map((step, idx) => (
                    <div key={step.id || idx} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6">
                      {/* Vòng tròn số thứ tự bước */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white font-extrabold text-sm shadow-md ring-4 ring-white z-10">
                        {step.stepNumber}
                      </div>

                      {/* Khối nội dung chi tiết bước */}
                      <div className="flex-1 bg-neutral-50/70 rounded-2xl p-5 border border-neutral-100 hover:border-orange-200 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <h3 className="text-base font-bold text-neutral-900">
                            {step.title}
                          </h3>
                          {step.timerMinutes && step.timerMinutes > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                              <span>⏰</span> {step.timerMinutes} phút
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                          {step.description}
                        </p>

                        {/* Ảnh minh họa của bước nếu có */}
                        {step.imageUrl && (
                          <div className="mt-4 relative aspect-video max-w-md overflow-hidden rounded-xl border border-neutral-200">
                            <img
                              src={step.imageUrl}
                              alt={`Minh họa bước ${step.stepNumber}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
                  Công thức này chưa được cập nhật các bước nấu chi tiết.
                </div>
              )}
            </section>

            {/* ── BỘ SƯU TẬP HÌNH ẢNH (GALLERY) NẾU CÓ NHIỀU ẢNH ── */}
            {recipe.images.length > 1 && (
              <section className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
                <h2 className="text-xl font-bold text-neutral-900 mb-2 flex items-center gap-2">
                  <span>📸</span> Thư viện hình ảnh món ăn
                </h2>
                <p className="text-xs text-neutral-500 mb-6">
                  Những góc nhìn hấp dẫn của món {recipe.title} do tác giả ghi lại
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {recipe.images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100"
                    >
                      <img
                        src={img.originalUrl}
                        alt={img.altText || recipe.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {img.isPrimary && (
                        <span className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                          Ảnh bìa
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── CỘT PHẢI (4/12): Dinh dưỡng, Checklist nguyên liệu, Tác giả ── */}
          <div className="lg:col-span-4 space-y-6">
            {/* ── 1. BẢNG NUTRITION FACTS (GIÁ TRỊ DINH DƯỠNG) ── */}
            {recipe.nutrition && (
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-900">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900">
                      Nutrition Facts
                    </h3>
                    <p className="text-[11px] text-neutral-500">Giá trị dinh dưỡng trên 1 khẩu phần</p>
                  </div>
                  <span className="text-2xl">🥑</span>
                </div>

                {/* Calories nổi bật */}
                <div className="flex items-baseline justify-between py-3 border-b-4 border-neutral-900">
                  <span className="text-sm font-extrabold text-neutral-900">Năng lượng (Calories)</span>
                  <span className="text-2xl font-black text-orange-600">
                    {recipe.nutrition.calories ?? '—'} <span className="text-xs font-normal text-neutral-500">kcal</span>
                  </span>
                </div>

                {/* Danh sách các chỉ số dinh dưỡng chi tiết */}
                <div className="divide-y divide-neutral-100 text-xs text-neutral-700">
                  <div className="flex justify-between py-2.5">
                    <span className="font-semibold text-neutral-800">Chất đạm (Protein)</span>
                    <span className="font-bold">{recipe.nutrition.protein != null ? `${recipe.nutrition.protein}g` : '—'}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="font-semibold text-neutral-800">Chất béo (Fat)</span>
                    <span className="font-bold">{recipe.nutrition.fat != null ? `${recipe.nutrition.fat}g` : '—'}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="font-semibold text-neutral-800">Carbohydrate (Carb)</span>
                    <span className="font-bold">{recipe.nutrition.carbohydrates != null ? `${recipe.nutrition.carbohydrates}g` : '—'}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-neutral-600">Chất xơ (Fiber)</span>
                    <span className="font-medium">{recipe.nutrition.fiber != null ? `${recipe.nutrition.fiber}g` : '—'}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-neutral-600">Natri (Sodium)</span>
                    <span className="font-medium">{recipe.nutrition.sodium != null ? `${recipe.nutrition.sodium}mg` : '—'}</span>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400 mt-3 italic border-t border-neutral-100 pt-2">
                  * Thông số dinh dưỡng được ước tính dựa trên các thành phần chuẩn.
                </p>
              </div>
            )}

            {/* ── 2. CHECKLIST NGUYÊN LIỆU (CLIENT COMPONENT) ── */}
            <IngredientChecklist
              ingredients={recipe.ingredients}
              defaultServings={recipe.servings}
            />

            {/* ── 3. THẺ TÁC GIẢ & THÔNG TIN CHIA SẺ ── */}
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                Chia sẻ bởi
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 font-bold text-lg">
                  {recipe.author.avatarUrl ? (
                    <img
                      src={recipe.author.avatarUrl}
                      alt={recipe.author.displayName}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    recipe.author.displayName?.charAt(0) || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900 truncate">
                    {recipe.author.displayName}
                  </p>
                  <p className="text-xs text-neutral-500">Tác giả công thức</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Link
                  href="/recipes"
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  ← Xem thêm món khác
                </Link>
                <Link
                  href="/dashboard/recipes/new"
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                >
                  + Viết công thức
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
