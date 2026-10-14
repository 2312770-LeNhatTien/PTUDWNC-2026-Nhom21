'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StepListEditor from '@/components/recipes/StepListEditor';
import { recipesApi } from '@/lib/api/recipes';
import type { RecipeListItemDto, RecipeStepDto } from '@/types/api';

export default function RecipeStepsPage() {
  // Danh sách các công thức món ăn tải từ máy chủ
  const [recipes, setRecipes] = useState<RecipeListItemDto[]>([]);
  // ID món ăn hiện đang được chọn để quản lý bước nấu
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  // Danh sách các bước nấu của món ăn đang chọn
  const [currentSteps, setCurrentSteps] = useState<RecipeStepDto[]>([]);
  // Từ khóa tìm kiếm món ăn trong danh sách
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Trạng thái đang tải danh sách món ăn
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Trạng thái đang tải các bước nấu của món ăn đã chọn
  const [isLoadingSteps, setIsLoadingSteps] = useState<boolean>(false);
  // Thông báo lỗi nếu xảy ra sự cố kết nối máy chủ
  const [error, setError] = useState<string | null>(null);

  // Phân quyền: Kiểm tra người dùng có phải Quản trị viên (Admin) hoặc Tác giả (Author)
  const [currentUser, setCurrentUser] = useState<{ id: string; roles?: string[] } | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  // 1. Tải danh sách món ăn khi khởi chạy trang
  useEffect(() => {
    async function loadRecipes() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await recipesApi.getAll({ pageSize: 50 });
        setRecipes(result.items);

        // Kiểm tra xem URL có truyền query param recipeId không
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const targetRecipeId = params?.get('recipeId');

        if (targetRecipeId && result.items.some((item) => item.id === targetRecipeId)) {
          setSelectedRecipeId(targetRecipeId);
        } else if (result.items.length > 0) {
          // Mặc định chọn món ăn đầu tiên để hiển thị ngay
          setSelectedRecipeId(result.items[0].id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ dữ liệu.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecipes();
  }, []);

  // 2. Tải danh sách các bước nấu mỗi khi chọn món ăn khác
  useEffect(() => {
    if (!selectedRecipeId) return;

    async function loadSteps() {
      setIsLoadingSteps(true);
      try {
        const steps = await recipesApi.getSteps(selectedRecipeId);
        setCurrentSteps(steps);
      } catch (err: unknown) {
        console.error('Lỗi khi tải các bước thực hiện:', err);
      } finally {
        setIsLoadingSteps(false);
      }
    }
    loadSteps();
  }, [selectedRecipeId]);

  const canManage = currentUser?.roles?.includes('Admin');

  // Giao diện khi khách (chưa đăng nhập hoặc không có quyền Admin/Author) cố gắng truy cập trang
  if (authChecked && !canManage) {
    return (
      <div className="min-h-screen bg-neutral-50/50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/80 p-8 text-center shadow-lg space-y-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-3xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-neutral-800">Quyền truy cập dành cho Ban Quản trị</h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Chức năng quản lý và biên soạn các bước nấu ăn chỉ dành cho Quản trị viên và Tác giả ẩm thực. Bạn có thể xem chi tiết hướng dẫn nấu nướng tại mục Khám phá công thức.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/recipes"
              className="w-full py-2.5 px-4 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition"
            >
              🍲 Khám phá các công thức món ngon
            </Link>
            <Link
              href="/login"
              className="w-full py-2.5 px-4 bg-neutral-100 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-200 transition"
            >
              🔐 Đăng nhập tài khoản Quản trị viên
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Tìm thông tin chi tiết của món ăn đang được chọn
  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  // Lọc danh sách món ăn theo ô tìm kiếm
  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FBF9F7] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Thanh điều hướng Breadcrumb phong cách ẩm thực */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/" className="hover:text-orange-600 transition font-medium">Trang chủ</Link>
          <span>/</span>
          <Link href="/recipes" className="hover:text-orange-600 transition font-medium">Khám phá công thức</Link>
          <span>/</span>
          <span className="text-neutral-900 font-semibold">Quy trình & Các bước nấu nướng</span>
        </nav>

        {/* Tiêu đề chính trang web */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/70 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold tracking-wide uppercase">
              <span>👨‍🍳</span> Không gian ẩm thực
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Quản Lý Quy Trình Chế Biến Món Ăn
            </h1>
            <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
              Thiết lập chi tiết từng bước nấu ăn, thời gian hẹn giờ và hình ảnh trực quan giúp người nấu dễ dàng thực hiện thành công từng món ăn ngon.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/recipes"
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>🍲</span> Xem Khám Phá
            </Link>
            <Link
              href="/recipes/ingredients-test"
              className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>🥗</span> Quản Lý Nguyên Liệu
            </Link>
          </div>
        </div>

        {/* Thông báo lỗi kết nối nếu có */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-semibold underline hover:no-underline"
            >
              Tải lại trang
            </button>
          </div>
        )}

        {/* Khung lựa chọn món ăn */}
        <div className="bg-white rounded-3xl border border-neutral-200/70 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span>🍲</span> Chọn món ăn để biên soạn bước nấu:
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Nhấn vào từng món ăn bên dưới để xem và tinh chỉnh các bước thực hiện.
              </p>
            </div>

            {/* Ô tìm kiếm món ăn */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Tìm món ăn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
              <span className="absolute left-2.5 top-2.5 text-neutral-400 text-xs">🔍</span>
            </div>
          </div>

          {/* Danh sách thẻ món ăn (Scroll ngang hoặc dạng thanh trượt) */}
          {isLoading ? (
            <div className="py-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tải danh sách món ăn từ hệ thống...</span>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-400">
              Không tìm thấy món ăn nào khớp với từ khóa &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {filteredRecipes.map((r) => {
                const isSelected = r.id === selectedRecipeId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecipeId(r.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-600/30 ring-offset-1'
                        : 'bg-neutral-100/80 hover:bg-neutral-200/70 text-neutral-700'
                    }`}
                  >
                    <span>{r.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        isSelected ? 'bg-orange-700/60 text-white' : 'bg-neutral-200/80 text-neutral-500'
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

        {/* Khung biên soạn bước nấu cho món ăn được chọn */}
        {selectedRecipe ? (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-neutral-200/70 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-orange-600 tracking-wide">
                  Đang thiết lập cho:
                </span>
                <h3 className="text-xl font-extrabold text-neutral-900 mt-0.5">
                  {selectedRecipe.title}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Danh mục: {selectedRecipe.categoryName || 'Món ăn gia đình'} • Độ khó: {selectedRecipe.difficulty}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/recipes/${selectedRecipe.slug}`}
                  target="_blank"
                  className="px-3.5 py-2 rounded-xl bg-orange-50 text-orange-700 border border-orange-200/80 text-xs font-bold hover:bg-orange-100 transition flex items-center gap-1.5"
                >
                  <span>👁️</span> Xem công thức công khai ↗
                </Link>
              </div>
            </div>

            {/* Trình biên tập các bước nấu */}
            {isLoadingSteps ? (
              <div className="bg-white rounded-3xl border border-neutral-200/70 p-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Đang tải các bước nấu...</span>
              </div>
            ) : (
              <StepListEditor
                recipeId={selectedRecipeId}
                initialSteps={currentSteps}
                onStepsChange={(newSteps) => setCurrentSteps(newSteps)}
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-neutral-200/70 p-12 text-center text-neutral-400 text-sm">
            Vui lòng chọn một món ăn phía trên để bắt đầu biên soạn quy trình nấu nướng.
          </div>
        )}

      </div>
    </div>
  );
}
