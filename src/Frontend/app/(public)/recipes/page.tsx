import { categoriesApi } from '@/lib/api/categories';
import RecipeSearchAndFilters from '@/components/recipes/RecipeSearchAndFilters';

export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, categories] = await Promise.all([searchParams, categoriesApi.getAll()]);
  return <main className="min-h-screen bg-neutral-50/50 pb-20"><section className="border-b bg-white py-10 text-center"><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">📖 Kho tàng ẩm thực Việt</span><h1 className="mt-3 text-3xl font-extrabold text-neutral-900">Khám Phá Công Thức Nấu Ăn</h1><p className="mt-2 text-sm text-neutral-600">Tìm món ngon theo tên, danh mục, thời gian nấu và độ khó.</p></section><section className="container mx-auto mt-8 px-4 sm:px-6 lg:px-8"><RecipeSearchAndFilters categories={categories} initialQuery={q} /></section></main>;
}
