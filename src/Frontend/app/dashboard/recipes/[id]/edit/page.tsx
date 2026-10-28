'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { recipesApi } from '@/lib/api/recipes';
import { categoriesApi } from '@/lib/api/categories';
import type { CategoryDto, RecipeEditDto, RecipeDifficulty, ProblemDetails } from '@/types/api';
import Modal from '@/components/dashboard/Modal';
import { useUnsavedChanges } from '@/components/dashboard/useUnsavedChanges';
import { errorMessage, problemOf } from '@/lib/api/errors';
import { statusLabel } from '@/components/dashboard/format';
import IngredientListEditor from '@/components/recipes/IngredientListEditor';
import StepListEditor from '@/components/recipes/StepListEditor';
import RecipeGalleryEditor from '@/components/recipes/RecipeGalleryEditor';
import PublishToggle from '@/components/recipes/PublishToggle';

const nutritionFields = [
  ['calories', 'Calories (kcal)'], ['protein', 'Protein (g)'], ['carbohydrates', 'Carbohydrate (g)'],
  ['fat', 'Chất béo (g)'], ['fiber', 'Chất xơ (g)'], ['sodium', 'Natri (mg)'],
] as const;
type NutritionKey = typeof nutritionFields[number][0];
type Form = {
  title: string; description: string; instructions: string; categoryId: string;
  prepTime: string; cookTime: string; servings: string; difficulty: RecipeDifficulty;
  nutrition: Record<NutritionKey, string>;
};
function formFrom(data: RecipeEditDto): Form {
  const r = data.recipe;
  return { title: r.title, description: r.description, instructions: r.instructions, categoryId: r.category.id,
    prepTime: String(r.prepTime), cookTime: String(r.cookTime), servings: String(r.servings), difficulty: r.difficulty,
    nutrition: Object.fromEntries(nutritionFields.map(([key]) => [key, r.nutrition?.[key] == null ? '' : String(r.nutrition[key])])) as Form['nutrition'] };
}

export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<RecipeEditDto | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<ProblemDetails['errors']>({});
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const syncSequence = useRef(0);

  const refreshContent = async () => {
    const sequence = ++syncSequence.current;
    setSyncing(true); setSyncFailed(false);
    try {
      const latest = await recipesApi.getForEdit(id);
      if (sequence !== syncSequence.current) return;
      // Thay đổi con làm đổi RowVersion D13; lấy token mới trước lần lưu tiếp theo.
      setData(latest);
      setError('');
      if (!dirty) setForm(formFrom(latest));
    } catch {
      setSyncFailed(true);
      setError('Nội dung đã lưu nhưng chưa tải được phiên bản mới. Hãy đồng bộ lại trước khi tiếp tục.');
    } finally { if (sequence === syncSequence.current) setSyncing(false); }
  };

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [result, cats] = await Promise.all([recipesApi.getForEdit(id), categoriesApi.getAll()]);
      setData(result); setForm(formFrom(result)); setCategories(cats); setDirty(false);
    } catch (err) { setLoadError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useUnsavedChanges(dirty);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !data || saving || syncing || syncFailed) return;
    setSaving(true); setError(''); setNotice(''); setErrors({});
    try {
      const hasNutrition = nutritionFields.some(([key]) => form.nutrition[key] !== '');
      const nutrition = hasNutrition ? Object.fromEntries(nutritionFields.map(([key]) => [key,
        form.nutrition[key] === '' ? null : Number(form.nutrition[key])])) : null;
      const result = await recipesApi.update(id, {
        title: form.title.trim(), description: form.description.trim(), instructions: form.instructions,
        categoryId: form.categoryId, prepTime: Number(form.prepTime), cookTime: Number(form.cookTime),
        servings: Number(form.servings), difficulty: form.difficulty, nutrition, rowVersion: data.rowVersion,
      });
      setData(result); setForm(formFrom(result)); setDirty(false); setNotice('Đã lưu công thức thành công.');
    } catch (err) {
      const p = problemOf(err);
      if (p.status === 409 && p.errorCode === 'RECIPE_CONCURRENCY_CONFLICT') setConflict(true);
      else { setError(errorMessage(err)); setErrors(p.errors || {}); }
    } finally { setSaving(false); }
  };

  const reloadLatest = async () => {
    setReloading(true); setError('');
    try {
      const result = await recipesApi.getForEdit(id);
      setData(result); setForm(formFrom(result)); setDirty(false); setErrors({}); setConflict(false);
      setNotice('Đã tải dữ liệu mới nhất. Bạn có thể chỉnh sửa và lưu tiếp.');
    } catch (err) { setError(errorMessage(err)); }
    finally { setReloading(false); }
  };
  const fieldError = (name: string) => {
    const key = Object.keys(errors || {}).find(key => key.toLowerCase() === name.toLowerCase());
    return key ? <p className="mt-1 text-sm text-red-700">{errors?.[key]?.join(' ')}</p> : null;
  };
  const change = (name: keyof Omit<Form, 'nutrition'>, value: string) => {
    setForm(prev => prev ? { ...prev, [name]: value } : prev); setDirty(true); setNotice('');
  };
  const inputClass = 'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100';

  return <main className="mx-auto max-w-4xl px-4 py-10">
    <Link href="/dashboard/recipes" className="text-sm text-orange-700 underline">← Công thức của tôi</Link>
    <h1 className="mb-6 mt-4 text-3xl font-bold">Chỉnh sửa công thức</h1>
    {loading ? <p role="status">Đang tải công thức...</p> : loadError ? <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">{loadError} <button onClick={load} className="ml-3 underline">Thử lại</button></div>
      : form && data && <>
        <div className="mb-5 flex flex-wrap justify-between gap-3"><span className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-800">{statusLabel[data.recipe.status]}</span>
          <Link href={`/dashboard/recipes/${id}/preview`} className="text-orange-700 underline">Xem trước</Link></div>
        {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
        {error && !conflict && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
        <form data-recipe-editor onSubmit={save} className="space-y-6 rounded-2xl border bg-white p-5 sm:p-8">
          <fieldset disabled={saving || reloading || syncing || syncFailed} className="space-y-5">
            <label className="block font-medium">Tiêu đề<input required maxLength={200} className={inputClass} value={form.title} onChange={e => change('title', e.target.value)} />{fieldError('Title')}</label>
            <label className="block font-medium">Mô tả<textarea required maxLength={2000} rows={4} className={inputClass} value={form.description} onChange={e => change('description', e.target.value)} />{fieldError('Description')}</label>
            <label className="block font-medium">Hướng dẫn chung<textarea rows={4} className={inputClass} value={form.instructions} onChange={e => change('instructions', e.target.value)} /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block font-medium">Danh mục<select className={inputClass} value={form.categoryId} onChange={e => change('categoryId', e.target.value)}>
                {!categories.some(c => c.id === form.categoryId) && <option value={form.categoryId}>{data.recipe.category.name}</option>}
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>{fieldError('CategoryId')}</label>
              <label className="block font-medium">Độ khó<select className={inputClass} value={form.difficulty} onChange={e => change('difficulty', e.target.value)}>
                <option value="Easy">Dễ</option><option value="Medium">Trung bình</option><option value="Hard">Khó</option><option value="Expert">Kỳ công</option>
              </select>{fieldError('Difficulty')}</label>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">{([
              ['prepTime', 'Chuẩn bị (phút)', 1], ['cookTime', 'Nấu (phút)', 0], ['servings', 'Khẩu phần', 1],
            ] as const).map(([name, label, min]) => <label key={name} className="block font-medium">{label}<input required type="number" step="1" min={min} className={inputClass} value={form[name]} onChange={e => change(name, e.target.value)} />{fieldError(name)}</label>)}</div>
            <h2 className="pt-3 text-xl font-semibold">Dinh dưỡng trên một khẩu phần</h2>
            <p className="text-sm text-neutral-500">Giữ nguyên các giá trị để bảo toàn dinh dưỡng hiện tại. Để trống tất cả nếu muốn xóa thông tin dinh dưỡng.</p>
            <div className="grid gap-4 sm:grid-cols-3">{nutritionFields.map(([key, label]) => <label key={key} className="block text-sm font-medium">{label}<input type="number" step="any" min="0" className={inputClass} value={form.nutrition[key]} onChange={e => { setForm({ ...form, nutrition: { ...form.nutrition, [key]: e.target.value } }); setDirty(true); setNotice(''); }} /></label>)}</div>
          </fieldset>
          {fieldError('RowVersion')}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5"><span className="text-sm text-neutral-500">{dirty ? 'Có thay đổi chưa lưu' : 'Dữ liệu đã đồng bộ'}</span>
            <button type="submit" disabled={saving || reloading || syncing || syncFailed} className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
        </form>
        {dirty && <p className="my-4 text-sm text-orange-800">Lưu thông tin chính trước khi chỉnh sửa nội dung bên dưới.</p>}
        {syncing && <p role="status" className="my-4">Đang đồng bộ nội dung...</p>}
        {syncFailed && <button type="button" onClick={() => void refreshContent()} className="my-4 text-orange-700 underline">Đồng bộ lại phiên bản</button>}
        <fieldset disabled={dirty || saving || syncing || syncFailed || conflict} className="mt-6 space-y-6 disabled:opacity-60">
          <IngredientListEditor recipeId={id} initialIngredients={data.recipe.ingredients} onIngredientsChange={() => void refreshContent()} />
          <StepListEditor recipeId={id} initialSteps={data.recipe.steps} onStepsChange={() => void refreshContent()} />
          <RecipeGalleryEditor recipeId={id} initialImages={data.recipe.images} onImagesChange={() => void refreshContent()} />
          <div className="rounded-2xl border bg-white p-5"><h2 className="mb-4 font-semibold">Trạng thái xuất bản</h2>
            <PublishToggle recipeId={id} initialStatus={data.recipe.status} ingredientCount={data.recipe.ingredients.length}
              stepCount={data.recipe.steps.length} onStatusChange={() => void refreshContent()} />
          </div>
        </fieldset>
      </>}
    {conflict && <Modal title="Công thức đã được thay đổi ở phiên khác" onClose={() => { if (!reloading) setConflict(false); }}>
      <p>Nội dung bạn đang nhập chưa được lưu và vẫn được giữ trên biểu mẫu.</p>
      <p className="mt-3 text-sm text-neutral-600">Chọn “Tải lại dữ liệu mới nhất” sẽ thay nội dung chưa lưu bằng phiên bản trên máy chủ. Bạn có thể quay lại để sao chép nội dung trước khi tải lại.</p>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button disabled={reloading} onClick={() => setConflict(false)} className="rounded-xl border px-4 py-2">Quay lại nội dung đang nhập</button>
        <button disabled={reloading} onClick={reloadLatest} className="rounded-xl bg-orange-600 px-4 py-2 text-white">{reloading ? 'Đang tải...' : 'Tải lại dữ liệu mới nhất'}</button></div>
    </Modal>}
  </main>;
}
