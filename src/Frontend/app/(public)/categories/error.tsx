'use client';

export default function CategoriesError({ reset }: { reset: () => void }) {
  return <div role="alert" className="container mx-auto p-10 text-center"><h2 className="text-xl font-bold">Không thể tải danh mục</h2><p className="my-4">Vui lòng kiểm tra kết nối và thử lại.</p><button onClick={reset} className="rounded-lg bg-orange-600 px-5 py-2 text-white">Thử lại</button></div>;
}
