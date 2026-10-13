'use client';

// ============================================================================
// TRANG QUẢN LÝ BỘ SƯU TẬP HÌNH ẢNH CÔNG THỨC (FR-RCP-008)
// Route: /recipes/gallery-test
// Thành viên phụ trách: Lê Nhật Tiến (MSSV: 2312770)
// Chức năng: Cho phép tác giả xem gallery ảnh, đặt ảnh bìa chính (isPrimary),
//            xóa ảnh và tải ảnh mới lên máy chủ MinIO.
// ============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RecipeGalleryEditor from '@/components/recipes/RecipeGalleryEditor';
import { recipesApi } from '@/lib/api/recipes';
import type { RecipeListItemDto, RecipeImageDto } from '@/types/api';

export default function RecipeGalleryTestPage() {
  // Danh sách công thức lấy từ hệ thống
  const [recipes, setRecipes] = useState<RecipeListItemDto[]>([]);
  // ID công thức đang được chọn để quản lý gallery
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  // Chi tiết hình ảnh của công thức đang chọn
  const [currentImages, setCurrentImages] = useState<RecipeImageDto[]>([]);
  // Từ khóa tìm kiếm công thức
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Trạng thái tải danh sách
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [isLoadingGallery, setIsLoadingGallery] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Tải danh sách công thức khi mở trang
  useEffect(() => {
    async function fetchRecipes() {
      setIsLoadingRecipes(true);
      setError(null);
      try {
        const result = await recipesApi.getAll({ pageSize: 30 });
        setRecipes(result.items);
        if (result.items.length > 0) {
          setSelectedRecipeId(result.items[0].id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải danh sách công thức.';
        setError(msg);
      } finally {
        setIsLoadingRecipes(false);
      }
    }
    fetchRecipes();
  }, []);

  // 2. Tải gallery hình ảnh khi chuyển đổi công thức
  useEffect(() => {
    if (!selectedRecipeId) return;

    const selected = recipes.find((r) => r.id === selectedRecipeId);
    if (!selected) return;

    async function fetchImages() {
      setIsLoadingGallery(true);
      try {
        const detail = await recipesApi.getBySlug(selected!.slug);
        setCurrentImages(detail?.images || []);
      } catch (err) {
        console.error('Lỗi khi tải bộ sưu tập ảnh:', err);
      } finally {
        setIsLoadingGallery(false);
      }
    }
    fetchImages();
  }, [selectedRecipeId, recipes]);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  // Lọc theo từ khóa tìm kiếm
  const filteredRecipes = recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── BREADCRUMB ĐIỀU HƯỚNG ── */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/" className="hover:text-orange-600 transition">Trang chủ</Link>
          <span>/</span>
          <Link href="/recipes" className="hover:text-orange-600 transition">Công thức</Link>
          <span>/</span>
          <span className="text-neutral-900 font-semibold">Quản lý Bộ Sưu Tập Ảnh (FR-RCP-008)</span>
        </nav>

        {/* ── BANNER TIÊU ĐỀ ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider">
              <span>📸</span> FR-RCP-008 • Lê Nhật Tiến (2312770)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Quản Lý Bộ Sưu Tập Hình Ảnh (Gallery)
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
              Chọn công thức nấu ăn bên dưới để trải nghiệm component <strong className="text-neutral-800">RecipeGalleryEditor</strong>: Xem các góc chụp, chọn ảnh bìa chính (IsPrimary), tải ảnh mới lên MinIO và xóa ảnh khỏi bộ sưu tập.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 bg-neutral-100 px-4 py-2.5 rounded-2xl shrink-0">
            <span>🖼️</span>
            <span>Tổng cộng: {recipes.length} món ăn</span>
          </div>
        </div>

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-semibold underline hover:no-underline"
            >
              Tải lại trang
            </button>
          </div>
        )}

        {/* ── DANH SÁCH LỰA CHỌN CÔNG THỨC ── */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span>🍽️</span> Chọn món ăn để quản lý ảnh:
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Nhấn vào món bên dưới để xem bộ sưu tập hình ảnh hiện tại
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Tìm món ăn hoặc danh mục..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>
          </div>

          {isLoadingRecipes ? (
            <div className="py-8 text-center text-sm text-neutral-400 animate-pulse">
              Đang tải danh sách công thức...
            </div>
          ) : recipes.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-400">
              Chưa có công thức nào trong hệ thống.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
              {filteredRecipes.map((recipe) => {
                const isSelected = recipe.id === selectedRecipeId;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    className={`text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-300 shadow-xs'
                        : 'border-neutral-200/80 hover:border-orange-200 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-neutral-900 text-xs truncate">{recipe.title}</p>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-600 text-white shrink-0">
                          Đang chọn
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-2">
                      <span className="text-orange-700 font-medium">🏷️ {recipe.categoryName}</span>
                      <span>•</span>
                      <span>⏱️ {recipe.cookTime}p</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KHU VỰC THỬ NGHIỆM COMPONENT RECIPEGALLERYEDITOR ── */}
        {selectedRecipeId && selectedRecipe && (
          <div className="space-y-4">
            {/* Thanh hiển thị món ăn được chọn */}
            <div className="bg-neutral-900 text-white rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-orange-400 text-xs font-bold uppercase tracking-wider block">
                  Đang quản lý hình ảnh cho:
                </span>
                <h3 className="text-lg font-bold mt-0.5">{selectedRecipe.title}</h3>
              </div>

              <Link
                href={`/recipes/${selectedRecipe.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
              >
                <span>👁️</span> Xem trang chi tiết món ăn
              </Link>
            </div>

            {/* Component RecipeGalleryEditor */}
            {isLoadingGallery ? (
              <div className="p-12 text-center text-sm text-neutral-500 bg-white rounded-3xl border border-neutral-200/80 animate-pulse">
                Đang nạp bộ sưu tập ảnh của món ăn...
              </div>
            ) : (
              <RecipeGalleryEditor
                key={selectedRecipeId}
                recipeId={selectedRecipeId}
                initialImages={currentImages}
                onImagesChange={(newImgs) => setCurrentImages(newImgs)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
