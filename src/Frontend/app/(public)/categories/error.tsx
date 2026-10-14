'use client';
import { ErrorState } from '@/components/shared/ErrorState';
export default function CategoriesError({ reset }: { reset: () => void }) {
  return <div className="container mx-auto p-10"><ErrorState title="Không thể tải danh mục" onRetry={reset} /></div>;
}
