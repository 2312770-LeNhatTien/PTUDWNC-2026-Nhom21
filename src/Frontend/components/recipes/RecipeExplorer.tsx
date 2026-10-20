'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/shared/Pagination';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { getApiError } from '@/lib/api/errors';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { recipesApi } from '@/lib/api/recipes';
import { categoriesApi } from '@/lib/api/categories';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { CategoryDto, RecipeDifficulty, RecipeListItemDto } from '@/types/api';

export default function RecipeExplorer() {
  const params = useSearchParams();
  const queryString = params.toString();
  const keyword = params.get('q') || '';
  const [text, setText] = useState(keyword);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [items, setItems] = useState<RecipeListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = 12;

  useEffect(() => { setText(keyword); }, [keyword]);
  useEffect(() => {
    if (text.trim() === keyword) return;
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      if (text.trim()) next.set('q', text.trim()); else next.delete('q');
      next.delete('page');
      window.history.replaceState(null, '', `/recipes?${next.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
  }, [text, keyword, queryString]);

  useEffect(() => {
    let active = true;
    categoriesApi.getAll().then(data => { if (active) { setCategories(data); setCategoryError(''); } })
      .catch(() => { if (active) setCategoryError('Không tải được danh mục. Bạn vẫn có thể tìm kiếm và dùng các bộ lọc khác.'); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    const current = new URLSearchParams(queryString);
    setLoading(true);
    setError('');
    const difficulty = current.get('difficulty');
    const maxCookTime = Number(current.get('maxCookTime'));
    recipesApi.search({
      q: current.get('q') || undefined,
      page: Math.max(1, Number(current.get('page')) || 1), pageSize,
      categoryId: current.get('categoryId') || undefined,
      difficulty: ['Easy', 'Medium', 'Hard', 'Expert'].includes(difficulty || '') ? difficulty as RecipeDifficulty : undefined,
      maxCookTime: maxCookTime > 0 ? maxCookTime : undefined,
      sortBy: current.get('sortBy') || undefined,
      sortOrder: current.get('sortOrder') === 'asc' ? 'asc' : 'desc',
      sort: current.get('sort') || undefined,
    }, controller.signal).then(data => {
      if (!controller.signal.aborted) { setItems(data.items); setTotal(data.total); }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(getApiError(error, 'Không thể tải công thức. Kiểm tra kết nối và thử lại.').message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [queryString, retry]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    if (key === 'sortBy' || key === 'sortOrder') next.delete('sort');
    window.history.replaceState(null, '', `/recipes?${next.toString()}`);
  }
  const selectClass = 'mt-1 w-full rounded-lg border bg-white p-2';
  return <div className="container mx-auto min-h-screen px-4 py-10">
    <h1 className="text-3xl font-bold">Khám phá công thức nấu ăn</h1>
    <p className="mt-2 text-neutral-500">Tìm món ăn tiếng Việt có dấu hoặc không dấu, lọc theo thời gian và độ khó.</p>
    <div className="my-6 flex flex-wrap gap-3">
      <label className="min-w-0 flex-1"><span className="sr-only">Tìm công thức</span><Input type="search" value={text} onChange={e => setText(e.target.value)} placeholder="Tìm món ăn, ví dụ: pho bo…" className="w-full rounded-xl border p-3" /></label>
      <Button variant="outline" aria-expanded={filtersOpen} aria-controls="recipe-filters" className="rounded-xl border border-orange-300 bg-orange-50 px-5 py-3 text-orange-800" onClick={() => setFiltersOpen(!filtersOpen)}>Bộ lọc {filtersOpen ? '▴' : '▾'}</Button>
    </div>
    {filtersOpen && <section id="recipe-filters" aria-label="Bộ lọc nâng cao" className="mb-6 grid gap-4 rounded-xl border bg-orange-50/50 p-5 sm:grid-cols-2 lg:grid-cols-5">
      <label>Danh mục<select aria-label="Danh mục" className={selectClass} value={params.get('categoryId') || ''} onChange={e => update('categoryId', e.target.value)}><option value="">Tất cả</option>{categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      <label>Độ khó<select aria-label="Độ khó" className={selectClass} value={params.get('difficulty') || ''} onChange={e => update('difficulty', e.target.value)}><option value="">Tất cả</option><option value="Easy">Dễ</option><option value="Medium">Vừa</option><option value="Hard">Khó</option><option value="Expert">Kỳ công</option></select></label>
      <label>Thời gian nấu tối đa<select aria-label="Thời gian nấu tối đa" className={selectClass} value={params.get('maxCookTime') || ''} onChange={e => update('maxCookTime', e.target.value)}><option value="">Không giới hạn</option>{[15, 30, 45, 60, 90, 120].map(m => <option value={m} key={m}>{m} phút</option>)}</select></label>
      <label>Sắp xếp theo<select aria-label="Sắp xếp theo" className={selectClass} value={params.get('sortBy') || 'createdAt'} onChange={e => update('sortBy', e.target.value)}><option value="createdAt">Ngày tạo</option><option value="title">Tên món</option><option value="cookTime">Thời gian nấu</option><option value="difficulty">Độ khó</option></select></label>
      <label>Thứ tự<select aria-label="Thứ tự" className={selectClass} value={params.get('sortOrder') || 'desc'} onChange={e => update('sortOrder', e.target.value)}><option value="desc">Giảm dần</option><option value="asc">Tăng dần</option></select></label>
      <button className="text-left font-semibold text-orange-700" onClick={() => { setText(''); window.history.replaceState(null, '', '/recipes'); }}>Xóa tìm kiếm và bộ lọc</button>
    </section>}
    {categoryError && <p role="status" className="mb-4 text-amber-800">{categoryError}</p>}
    <section aria-label="Kết quả công thức" aria-busy={loading}>
      {loading ? <LoadingState message="Đang tìm công thức…" /> : error ? <ErrorState title="Không thể tải công thức" message={error} onRetry={() => setRetry(n => n + 1)} /> : <>
        <p role="status" className="mb-5 text-neutral-600">Tìm thấy {total} công thức{keyword ? ` cho “${keyword}”` : ''}.</p>
        {items.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> : <p className="rounded-xl border border-dashed p-10 text-center">Không có công thức phù hợp. Hãy thử từ khóa hoặc bộ lọc khác.</p>}
        <Pagination page={page} total={total} pageSize={pageSize} onPageChange={page => update('page', String(page))} />
      </>}
    </section>
  </div>;
}
