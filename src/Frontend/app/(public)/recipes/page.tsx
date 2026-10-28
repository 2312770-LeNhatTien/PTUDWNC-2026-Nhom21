import type { Metadata } from 'next';
import { Suspense } from 'react';
import RecipeExplorer from '@/components/recipes/RecipeExplorer';

export const metadata: Metadata = {
  title: 'Khám Phá Công Thức Nấu Ăn Chuẩn Vị | Culinary Blog',
  description: 'Khám phá hàng trăm công thức món ngon Việt Nam và quốc tế, hướng dẫn chi tiết từng bước nấu ăn và định lượng nguyên liệu chính xác.',
  alternates: {
    canonical: '/recipes',
  },
  openGraph: {
    title: 'Khám Phá Công Thức Nấu Ăn Chuẩn Vị | Culinary Blog',
    description: 'Khám phá hàng trăm công thức món ngon Việt Nam và quốc tế, hướng dẫn chi tiết từng bước nấu ăn và định lượng nguyên liệu chính xác.',
    url: '/recipes',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Khám Phá Công Thức Nấu Ăn Chuẩn Vị | Culinary Blog',
    description: 'Khám phá hàng trăm công thức món ngon Việt Nam và quốc tế.',
  },
};

export default function RecipesPage() {
  return (
    <Suspense fallback={<p className="p-10" role="status">Đang tải trang công thức…</p>}>
      <RecipeExplorer />
    </Suspense>
  );
}
