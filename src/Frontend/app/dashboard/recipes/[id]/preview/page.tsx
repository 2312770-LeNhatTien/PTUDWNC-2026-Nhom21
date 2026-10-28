'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { recipesApi } from '@/lib/api/recipes';
import type { RecipeDetailDto } from '@/types/api';
import IngredientChecklist from '@/components/recipes/IngredientChecklist';
import { errorMessage } from '@/lib/api/errors';
import { statusLabel } from '@/components/dashboard/format';
import PublishToggle from '@/components/recipes/PublishToggle';

export default function RecipePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<RecipeDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRecipe((await recipesApi.getForEdit(id)).recipe); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const image = recipe?.images.find(i => i.isPrimary) ?? recipe?.images[0];
  return <main className="mx-auto max-w-5xl px-4 py-10">
    <div className="mb-6 flex justify-between"><Link href="/dashboard/recipes" className="text-orange-700 underline">← Công thức của tôi</Link><Link href={`/dashboard/recipes/${id}/edit`} className="text-orange-700 underline">Chỉnh sửa</Link></div>
    {loading ? <p role="status">Đang tải bản xem trước...</p> : error ? <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">{error} <button onClick={load} className="ml-3 underline">Thử lại</button></div>
      : recipe && <>
        <p className="mb-4 rounded-xl bg-orange-50 p-4 text-orange-900">Xem trước riêng tư · {statusLabel[recipe.status]}</p>
        <div className="mb-5"><PublishToggle recipeId={id} initialStatus={recipe.status}
          ingredientCount={recipe.ingredients.length} stepCount={recipe.steps.length} onStatusChange={() => void load()} /></div>
        <h1 className="text-3xl font-bold">{recipe.title}</h1><p className="mt-4 text-neutral-600">{recipe.description}</p>
        <p className="my-5 text-sm text-neutral-500">{recipe.author.displayName} · {recipe.category.name} · Chuẩn bị {recipe.prepTime} phút · Nấu {recipe.cookTime} phút · {recipe.servings} khẩu phần</p>
        {image && <img src={image.originalUrl} alt={image.altText || recipe.title} className="mb-8 max-h-96 w-full rounded-2xl object-cover" />}
        <div className="grid gap-8 md:grid-cols-3"><div className="space-y-6 md:col-span-2">
          <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">Hướng dẫn chung</h2><p className="mt-3 whitespace-pre-wrap">{recipe.instructions || 'Chưa có hướng dẫn chung.'}</p></section>
          <section className="rounded-2xl border bg-white p-6"><h2 className="mb-5 text-xl font-semibold">Các bước thực hiện</h2>
            {recipe.steps.length ? recipe.steps.map(step => <article key={step.id} className="mb-6 border-b pb-5 last:border-0"><h3 className="font-semibold">{step.stepNumber}. {step.title}</h3><p className="mt-2 whitespace-pre-wrap">{step.description}</p>{step.timerMinutes != null && <p className="mt-2 text-sm text-orange-700">{step.timerMinutes} phút</p>}{step.imageUrl && <img src={step.imageUrl} alt={`Bước ${step.stepNumber}`} className="mt-3 max-h-64 rounded-xl" />}</article>) : <p>Chưa có bước nấu.</p>}
          </section>
          {recipe.images.length > 1 && <section className="rounded-2xl border bg-white p-6"><h2 className="mb-4 text-xl font-semibold">Hình ảnh món ăn</h2><div className="grid grid-cols-2 gap-3">{recipe.images.map(img => <img key={img.id} src={img.originalUrl} alt={img.altText || recipe.title} className="h-44 w-full rounded-xl object-cover" />)}</div></section>}
        </div><aside className="space-y-6"><IngredientChecklist ingredients={recipe.ingredients} defaultServings={recipe.servings} />
          {recipe.nutrition && <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 font-semibold">Dinh dưỡng / khẩu phần</h2><dl className="space-y-2">{([
            ['Calories', recipe.nutrition.calories, 'kcal'], ['Protein', recipe.nutrition.protein, 'g'], ['Carbohydrate', recipe.nutrition.carbohydrates, 'g'],
            ['Chất béo', recipe.nutrition.fat, 'g'], ['Chất xơ', recipe.nutrition.fiber, 'g'], ['Natri', recipe.nutrition.sodium, 'mg'],
          ] as const).map(([label, value, unit]) => <div key={label} className="flex justify-between gap-2"><dt>{label}</dt><dd>{value == null ? '—' : `${value} ${unit}`}</dd></div>)}</dl></section>}
        </aside></div>
      </>}
  </main>;
}
