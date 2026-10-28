'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { recipesApi } from '@/lib/api/recipes';
import type { MyRecipeDto, RecipeStatus, PaginationMeta } from '@/types/api';
import Modal from '@/components/dashboard/Modal';
import { errorMessage } from '@/lib/api/errors';
import { displayDate, statusLabel } from '@/components/dashboard/format';

export default function MyRecipesPage() {
  const [status, setStatus] = useState<RecipeStatus | ''>('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [items, setItems] = useState<MyRecipeDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, pageSize: 12, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<{ kind: 'archive' | 'delete'; recipe: MyRecipeDto } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    recipesApi.getMine({ page, pageSize: 12, status: status || undefined, sortBy: 'updatedAt', sortOrder: 'desc' }, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        const last = Math.max(1, data.meta.totalPages);
        if (page > last) { setPage(last); return; }
        setItems(data.items); setMeta(data.meta);
      })
      .catch(err => { if (!axios.isCancel(err) && !controller.signal.aborted) setError(errorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, page, reload]);

  const confirmAction = async () => {
    if (!action || busy) return;
    setBusy(true); setActionError('');
    try {
      if (action.kind === 'archive') await recipesApi.archive(action.recipe.id);
      else await recipesApi.delete(action.recipe.id);
      setNotice(action.kind === 'archive' ? 'Đã lưu trữ công thức.' : 'Đã xóa mềm công thức. Dữ liệu và ảnh được giữ lại.');
      setAction(null); setReload(v => v + 1);
    } catch (err) { setActionError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return <main className="mx-auto max-w-6xl px-4 py-10">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-sm font-semibold text-orange-600">Không gian tác giả</p>
        <h1 className="text-3xl font-bold">Công thức của tôi</h1>
        <p className="mt-2 text-neutral-500">Quản lý bản nháp, công thức đã đăng và các bài đã lưu trữ.</p></div>
      <Link href="/dashboard/recipes/new" className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white">+ Viết công thức mới</Link>
    </div>
    {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <label htmlFor="recipe-status" className="font-medium">Trạng thái</label>
      <select id="recipe-status" value={status} onChange={e => { setStatus(e.target.value as RecipeStatus | ''); setPage(1); }} className="rounded-xl border p-2.5">
        <option value="">Tất cả</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button onClick={() => setReload(v => v + 1)} disabled={loading} className="rounded-xl border px-4 py-2.5 disabled:opacity-50">Làm mới</button>
    </div>
    {loading ? <p role="status" className="rounded-2xl bg-white p-10 text-center">Đang tải công thức...</p>
      : error ? <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">{error} <button onClick={() => setReload(v => v + 1)} className="ml-3 underline">Thử lại</button></div>
      : items.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center"><p>Chưa có công thức trong trạng thái này.</p><Link href="/dashboard/recipes/new" className="mt-3 inline-block text-orange-700 underline">Tạo bản nháp đầu tiên</Link></div>
      : <><p className="mb-4 text-sm text-neutral-500">{meta.total} công thức · Trang {page}/{meta.totalPages}</p>
        <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm">
          <thead className="bg-neutral-50"><tr><th className="p-4">Công thức</th><th className="p-4">Trạng thái</th><th className="p-4">Cập nhật</th><th className="p-4">Thao tác</th></tr></thead>
          <tbody>{items.map(recipe => <tr key={recipe.id} className="border-t">
            <td className="p-4"><div className="flex min-w-48 items-center gap-3">{recipe.primaryImageUrl && <img src={recipe.primaryImageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />}
              <div><p className="font-semibold">{recipe.title}</p><p className="text-xs text-neutral-500">{recipe.categoryName}</p></div></div></td>
            <td className="p-4"><span className="whitespace-nowrap rounded-full bg-orange-50 px-3 py-1 text-orange-800">{statusLabel[recipe.status]}</span></td>
            <td className="whitespace-nowrap p-4 text-neutral-500">{displayDate(recipe.updatedAt || recipe.createdAt)}</td>
            <td className="p-4"><div className="flex min-w-64 flex-wrap gap-3">
              <Link href={`/dashboard/recipes/${recipe.id}/preview`} className="text-neutral-700 underline">Xem trước</Link>
              <Link href={`/dashboard/recipes/${recipe.id}/edit`} className="font-semibold text-orange-700 underline">Sửa</Link>
              {recipe.status !== 'Archived' && <button disabled={busy} onClick={() => { setActionError(''); setAction({ kind: 'archive', recipe }); }} className="text-neutral-700 underline">Lưu trữ</button>}
              <button disabled={busy} onClick={() => { setActionError(''); setAction({ kind: 'delete', recipe }); }} className="text-red-700 underline">Xóa mềm</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
        <nav aria-label="Phân trang công thức" className="mt-6 flex justify-center gap-4">
          <button disabled={page <= 1} onClick={() => setPage(v => v - 1)} className="rounded-xl border px-4 py-2 disabled:opacity-40">Trước</button>
          <span className="py-2">Trang {page}/{meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(v => v + 1)} className="rounded-xl border px-4 py-2 disabled:opacity-40">Sau</button>
        </nav></>}
    {action && <Modal title={action.kind === 'archive' ? 'Lưu trữ công thức' : 'Xóa mềm công thức'} onClose={() => { if (!busy) setAction(null); }}>
      <p className="mb-3 font-semibold">{action.recipe.title}</p>
      <p className="text-neutral-600">{action.kind === 'archive' ? 'Bài sẽ ẩn khỏi danh sách công khai và được giữ trong mục Đã lưu trữ.' : 'Bài sẽ ẩn khỏi danh sách của bạn. Bản ghi và ảnh vẫn được giữ lại trong hệ thống.'}</p>
      {actionError && <p role="alert" className="mt-4 text-red-700">{actionError}</p>}
      <div className="mt-6 flex justify-end gap-3"><button disabled={busy} onClick={() => setAction(null)} className="rounded-xl border px-4 py-2">Hủy</button>
        <button disabled={busy} onClick={confirmAction} className="rounded-xl bg-orange-600 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Đang xử lý...' : action.kind === 'archive' ? 'Xác nhận lưu trữ' : 'Xác nhận xóa mềm'}</button></div>
    </Modal>}
  </main>;
}
