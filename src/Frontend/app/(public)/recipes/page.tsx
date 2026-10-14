import { Suspense } from 'react';
import RecipeExplorer from '@/components/recipes/RecipeExplorer';

export default function RecipesPage() {
  return <Suspense fallback={<p className="p-10" role="status">Đang tải trang công thức…</p>}><RecipeExplorer /></Suspense>;
}
