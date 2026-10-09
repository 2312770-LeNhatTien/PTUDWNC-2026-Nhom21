// ============================================================================
// TRANG KIỂM THỬ: QUẢN LÝ NGUYÊN LIỆU MÓN ĂN (IngredientListEditor Test Page)
// Tuần 5: Frontend Integration & Profile / Editor UI
// Tác giả: Nguyễn Đình Tuấn (MSSV: 2312792)
// Kiểm thử:
//   1. Nhập liên tục bằng phím Enter (không cần chạm chuột)
//   2. Quyết định kiến trúc D10: Nullable Quantity & Unit cho gia vị nêm nếm
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import IngredientListEditor from '@/components/recipes/IngredientListEditor';
import { recipesApi } from '@/lib/api/recipes';
import type { RecipeListItemDto, RecipeIngredientDto } from '@/types/api';

export default function IngredientsTestPage() {
  const [recipes, setRecipes] = useState<RecipeListItemDto[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [currentIngredients, setCurrentIngredients] = useState<RecipeIngredientDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Tải danh sách món ăn từ Backend GET /api/v1/recipes
  useEffect(() => {
    async function fetchRecipes() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await recipesApi.getAll({ pageSize: 50 });
        setRecipes(res.items);
        if (res.items.length > 0) {
          setSelectedRecipeId(res.items[0].id);
        }
      } catch {
        setError('Không thể tải danh sách món ăn từ máy chủ.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecipes();
  }, []);

  // Tải danh sách nguyên liệu khi chọn món khác
  useEffect(() => {
    if (!selectedRecipeId) return;

    async function fetchIngredients() {
      setIsLoadingIngredients(true);
      try {
        const items = await recipesApi.getIngredients(selectedRecipeId);
        setCurrentIngredients(items);
      } catch (err: unknown) {
        console.error('Lỗi khi tải nguyên liệu:', err);
      } finally {
        setIsLoadingIngredients(false);
      }
    }

    fetchIngredients();
  }, [selectedRecipeId]);

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  return (
    <div className="min-h-screen bg-neutral-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-neutral-500 flex items-center gap-2">
          <Link href="/" className="hover:text-amber-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link href="/recipes/steps-test" className="hover:text-amber-600 transition-colors">Các bước nấu</Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Quản lý nguyên liệu (FR-RCP-009)</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full mb-2">
              <span>🥕</span> LAB 5 - QUẢN LÝ NGUYÊN LIỆU (FR-RCP-009)
            </div>
            <h1 className="text-2xl font-black text-neutral-800 tracking-tight">
              Biên Soạn & Thử Nghiệm Nguyên Liệu Món Ăn
            </h1>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
              Hỗ trợ nhập liệu siêu tốc bằng phím <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-[11px] font-mono font-bold">Enter</kbd> liên tục và tuân thủ chặt chẽ <strong>Quyết định thiết kế D10</strong> (Nullable Quantity & Unit cho gia vị nêm nếm).
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/profile"
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>👤</span> Xem Hồ Sơ Cá Nhân
            </Link>
            <Link
              href="/recipes/steps-test"
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>🍳</span> Các Bước Nấu Ăn
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-2xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: DANH SÁCH MÓN ĂN ĐỂ CHỌN */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-xs">
              <div className="mb-3">
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Chọn món ăn để quản lý nguyên liệu:
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm món ăn..."
                  className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-xs text-neutral-400">Đang tải danh sách món...</div>
              ) : (
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {filteredRecipes.map((r) => {
                    const isSelected = r.id === selectedRecipeId;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRecipeId(r.id)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white font-bold shadow-xs'
                            : 'hover:bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        <span className="truncate pr-2">{r.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                            isSelected ? 'bg-amber-700/60 text-white' : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {r.difficulty}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: COMPONENT INGREDIENT LIST EDITOR */}
          <div className="lg:col-span-8 space-y-4">
            {selectedRecipe ? (
              <div className="space-y-4">
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-amber-800 uppercase font-bold tracking-wider">Món đang chọn:</span>
                    <h3 className="text-base font-extrabold text-neutral-800">{selectedRecipe.title}</h3>
                  </div>
                  <span className="text-xs bg-white px-3 py-1 rounded-full border border-amber-200 text-amber-800 font-semibold shadow-2xs">
                    {selectedRecipe.categoryName || 'Món ăn'}
                  </span>
                </div>

                {isLoadingIngredients ? (
                  <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
                    Đang tải danh sách nguyên liệu của món...
                  </div>
                ) : (
                  <IngredientListEditor
                    recipeId={selectedRecipeId}
                    initialIngredients={currentIngredients}
                    onIngredientsChange={(list) => setCurrentIngredients(list)}
                  />
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
                Vui lòng chọn một món ăn bên trái để bắt đầu quản lý nguyên liệu.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
