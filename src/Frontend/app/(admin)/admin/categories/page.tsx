'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { categoriesApi, type CreateCategoryRequest } from '@/lib/api/categories';
import type { CategoryDto, ProblemDetails } from '@/types/api';
import ImageUploader from '@/components/ui/ImageUploader';

const emptyForm = { name: '', description: '', imageUrl: '', orderIndex: 0 };
function errorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: ProblemDetails } }).response;
  if (response?.status === 409) return response.data?.detail === 'CATEGORY_NOT_EMPTY'
    ? 'Danh mục còn công thức. Hãy chuyển hoặc xóa các công thức trước khi xóa danh mục.'
    : 'Tên danh mục đã tồn tại hoặc danh mục còn công thức.';
  if (response?.status === 403) return 'Chỉ quản trị viên mới có quyền quản lý danh mục.';
  return response?.data?.detail || 'Không thể thực hiện thao tác. Vui lòng thử lại.';
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const editor = useRef<HTMLDialogElement>(null);
  const confirmation = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setCategories(await categoriesApi.getAll()); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function openEditor(category: CategoryDto | null) {
    setEditing(category);
    setForm(category ? { name: category.name, description: category.description || '', imageUrl: category.imageUrl || '', orderIndex: category.orderIndex } : emptyForm);
    setFormError('');
    editor.current?.showModal();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || form.name.trim().length > 100 || form.orderIndex < 0 || !Number.isInteger(form.orderIndex)) {
      setFormError('Nhập tên từ 1–100 ký tự và thứ tự hiển thị là số nguyên không âm.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload: CreateCategoryRequest = { ...form, name: form.name.trim(), description: form.description.trim(), imageUrl: form.imageUrl.trim() };
    try {
      if (editing) await categoriesApi.update(editing.id, payload);
      else await categoriesApi.create(payload);
      editor.current?.close();
      setMessage(editing ? 'Đã cập nhật danh mục và giữ nguyên slug (D12).' : 'Đã tạo danh mục.');
      await load();
    } catch (err) { setFormError(errorMessage(err)); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!deleting) return;
    setSaving(true);
    setFormError('');
    try {
      await categoriesApi.delete(deleting.id);
      confirmation.current?.close();
      setMessage('Đã xóa mềm danh mục (D1).');
      await load();
    } catch (err) { setFormError(errorMessage(err)); }
    finally { setSaving(false); }
  }
  const inputClass = 'w-full rounded-lg border p-2 text-neutral-900';
  const buttonClass = 'rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50';
  return (
    <div className="container mx-auto min-h-screen px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Quản lý danh mục ẩm thực</h1><p className="text-neutral-500">Thêm, sửa và xóa danh mục</p></div>
        <button className={buttonClass} onClick={() => openEditor(null)}>+ Thêm danh mục</button>
      </div>
      {message && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-green-800">{message}</p>}
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error} <button onClick={() => void load()} className="underline">Thử lại</button></div>}
      <label className="block max-w-md">Tìm danh mục<input className={`${inputClass} my-3`} value={filter} onChange={e => setFilter(e.target.value)} placeholder="Tên hoặc slug" /></label>
      {loading ? <p role="status">Đang tải danh mục…</p> : <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left"><thead className="bg-orange-50"><tr>{['Tên danh mục', 'Slug', 'Số món', 'Thứ tự', 'Thao tác'].map(title => <th className="p-4" key={title}>{title}</th>)}</tr></thead>
          <tbody>{categories.filter(c => `${c.name} ${c.slug}`.toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi'))).map(category => <tr key={category.id} className="border-t">
            <td className="p-4"><a href={`/categories/${category.slug}`} className="font-semibold text-orange-700">{category.name}</a><p className="text-sm text-neutral-500">{category.description}</p></td>
            <td className="p-4">{category.slug}</td><td className="p-4">{category.recipeCount}</td><td className="p-4">{category.orderIndex}</td>
            <td className="p-4"><div className="flex gap-4"><button onClick={() => openEditor(category)} className="text-orange-700" aria-label={`Sửa ${category.name}`}>Sửa</button><button className="text-red-700" aria-label={`Xóa ${category.name}`} onClick={() => { setDeleting(category); setFormError(''); confirmation.current?.showModal(); }}>Xóa</button></div></td>
          </tr>)}</tbody>
        </table>{!categories.length && !error && <p className="p-6">Chưa có danh mục.</p>}
      </div>}
      <dialog ref={editor} aria-labelledby="category-editor-title" className="w-full max-w-lg rounded-2xl p-6 backdrop:bg-black/50" onCancel={e => { if (saving) e.preventDefault(); }}>
        <form onSubmit={save} className="space-y-4">
          <h2 id="category-editor-title" className="text-xl font-bold">{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>
          <label className="block">Tên danh mục<input autoFocus required maxLength={100} className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          {editing && <p className="rounded-lg bg-orange-50 p-3 text-sm">Slug giữ nguyên: <strong>{editing.slug}</strong>. Đổi tên không làm thay đổi liên kết.</p>}
          <label className="block">Mô tả<textarea className={inputClass} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
          <label className="block">URL ảnh<input type="url" className={inputClass} value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /></label>
          <ImageUploader onUploadSuccess={url => setForm(previous => ({ ...previous, imageUrl: url }))} />
          <label className="block">Thứ tự hiển thị<input type="number" min={0} step={1} required className={inputClass} value={form.orderIndex} onChange={e => setForm({ ...form, orderIndex: Number(e.target.value) })} /></label>
          {formError && <p role="alert" className="text-red-700">{formError}</p>}
          <div className="flex justify-end gap-4"><button type="button" disabled={saving} onClick={() => editor.current?.close()}>Hủy</button><button disabled={saving} className={buttonClass}>{saving ? 'Đang lưu…' : 'Lưu danh mục'}</button></div>
        </form>
      </dialog>
      <dialog ref={confirmation} aria-labelledby="delete-category-title" className="w-full max-w-md space-y-4 rounded-2xl p-6 backdrop:bg-black/50" onCancel={e => { if (saving) e.preventDefault(); }}>
        <h2 id="delete-category-title" className="text-xl font-bold">Xóa danh mục?</h2><p>Bạn muốn xóa “{deleting?.name}”? Chỉ danh mục không còn công thức mới được xóa. Dữ liệu được xóa mềm.</p>
        {formError && <p role="alert" className="text-red-700">{formError}</p>}
        <div className="flex justify-end gap-4"><button disabled={saving} onClick={() => confirmation.current?.close()}>Hủy</button><button disabled={saving} onClick={() => void remove()} className={buttonClass}>{saving ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div>
      </dialog>
    </div>
  );
}
