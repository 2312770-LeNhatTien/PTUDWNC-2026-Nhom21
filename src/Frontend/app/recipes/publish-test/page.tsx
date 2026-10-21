// ============================================================================
// TRANG KIỂM THỬ: LUỒNG XUẤT BẢN CÔNG THỨC & QUYẾT ĐỊNH D11 (FR-RCP-005 UI)
// Tuần 6 (Lab 6): Luồng Xuất bản & Phân quyền Next.js
// Tác giả: Lâm Văn Đức (MSSV: 2314299)
// Nhóm 21 - PTUDWNC-2026
// Mục tiêu kiểm thử:
//   1. Công tắc bật/tắt Publish / Unpublish tương tác hai chiều
//   2. Modal kiểm tra điều kiện D11 (bắt buộc >= 1 nguyên liệu và >= 1 bước nấu)
//   3. Gọi trực tiếp API Backend PATCH /publish và PATCH /unpublish
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PublishToggle from '@/components/recipes/PublishToggle';
import PublishRequirementModal from '@/components/recipes/PublishRequirementModal';
import { recipesApi } from '@/lib/api/recipes';
import type { RecipeListItemDto } from '@/types/api';

export default function PublishTestPage() {
  // 1. Quản lý danh sách món ăn từ Backend
  const [recipes, setRecipes] = useState<RecipeListItemDto[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 2. Chi tiết món ăn đang chọn
  const [selectedRecipeStatus, setSelectedRecipeStatus] = useState<string>('Draft');
  const [selectedRecipeTitle, setSelectedRecipeTitle] = useState<string>('');
  const [selectedIngredientCount, setSelectedIngredientCount] = useState<number>(0);
  const [selectedStepCount, setSelectedStepCount] = useState<number>(0);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // 3. Khu vực Sandbox Giả Lập Điều Kiện D11
  const [sandboxIngredients, setSandboxIngredients] = useState<number>(0);
  const [sandboxSteps, setSandboxSteps] = useState<number>(0);
  const [sandboxStatus, setSandboxStatus] = useState<'Draft' | 'Published'>('Draft');
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState<boolean>(false);

  // Tải danh sách công thức ban đầu từ Backend
  useEffect(() => {
    async function loadRecipes() {
      setIsLoadingList(true);
      setFetchError(null);
      try {
        const res = await recipesApi.getAll({ pageSize: 30 });
        setRecipes(res.items);
        if (res.items.length > 0) {
          setSelectedRecipeId(res.items[0].id);
        }
      } catch {
        setFetchError('Không thể kết nối máy chủ để tải danh sách công thức.');
      } finally {
        setIsLoadingList(false);
      }
    }

    loadRecipes();
  }, []);

  // Khi chọn món ăn khác, tải chi tiết nguyên liệu và bước của món đó
  useEffect(() => {
    if (!selectedRecipeId) return;

    async function loadRecipeDetails() {
      setIsLoadingDetails(true);
      try {
        const item = recipes.find((r) => r.id === selectedRecipeId);
        if (item) {
          setSelectedRecipeTitle(item.title);
          setSelectedRecipeStatus(item.status);
        }

        const [ingredients, steps] = await Promise.all([
          recipesApi.getIngredients(selectedRecipeId).catch(() => []),
          recipesApi.getSteps(selectedRecipeId).catch(() => []),
        ]);

        setSelectedIngredientCount(ingredients.length);
        setSelectedStepCount(steps.length);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu món ăn:', err);
      } finally {
        setIsLoadingDetails(false);
      }
    }

    loadRecipeDetails();
  }, [selectedRecipeId, recipes]);

  // Xử lý nút thử nghiệm trong Sandbox
  const handleSandboxPublishAttempt = () => {
    if (sandboxIngredients < 1 || sandboxSteps < 1) {
      setIsSandboxModalOpen(true);
    } else {
      setSandboxStatus('Published');
    }
  };

  const isD11Satisfied = selectedIngredientCount >= 1 && selectedStepCount >= 1;

  return (
    <div className="min-h-screen bg-neutral-50/70 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header điều hướng & giới thiệu */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 mb-2">
                <span>🧪</span> PHÒNG THỬ NGHIỆM TUẦN 6 (LAB 6)
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                Kiểm Thử Công Tắc Xuất Bản & Điều Kiện D11
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                Thành viên phụ trách: <strong>Lâm Văn Đức (2314299)</strong> - Nhóm 21 (PTUDWNC-2026)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/recipes/new"
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs"
              >
                + Soạn Bài Mới
              </Link>
              <Link
                href="/recipes"
                className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition"
              >
                Xem Thư Viện
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <span>📌</span> QUYẾT ĐỊNH KIẾN TRÚC D11 (DECISION 11):
            </p>
            <p>
              Một bài viết chỉ được phép chuyển sang trạng thái <strong>Published</strong> khi có tối thiểu{' '}
              <strong>1 nguyên liệu</strong> (Ingredients $\ge$ 1) và <strong>1 bước thực hiện</strong> (Steps $\ge$ 1).
              Mọi hành vi xuất bản khi chưa đủ 2 tiêu chí trên sẽ bị chặn lập tức và hiển thị Modal cảnh báo chi tiết.
            </p>
          </div>
        </div>

        {/* PHẦN 1: KIỂM THỬ TRÊN DỮ LIỆU THỰC TẾ (REAL DATA) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center text-sm font-bold">
                1
              </span>
              Kiểm Thử Với Dữ Liệu Bài Viết Thật Từ Backend
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Chọn công thức từ hệ thống cơ sở dữ liệu để kiểm tra tương tác API thật (`PATCH /publish` và `PATCH /unpublish`).
            </p>
          </div>

          {fetchError ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
              {fetchError}
            </div>
          ) : isLoadingList ? (
            <div className="text-sm text-neutral-500 flex items-center gap-2 py-4">
              <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Đang tải danh sách bài viết...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Chọn bài viết */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Chọn công thức để thao tác:
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full sm:w-2/3 px-4 py-2.5 rounded-xl border border-neutral-300 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.status}) - ID: {r.id.substring(0, 8)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Thông tin chi tiết bài viết đã chọn */}
              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      {selectedRecipeTitle || 'Đang chọn bài viết...'}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Mã Recipe ID: <code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">{selectedRecipeId}</code>
                    </p>
                  </div>

                  {/* Component PublishToggle được gắn trực tiếp */}
                  {!isLoadingDetails && selectedRecipeId && (
                    <div className="p-2.5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
                      <PublishToggle
                        recipeId={selectedRecipeId}
                        initialStatus={selectedRecipeStatus}
                        ingredientCount={selectedIngredientCount}
                        stepCount={selectedStepCount}
                        onStatusChange={(newStatus) => setSelectedRecipeStatus(newStatus)}
                      />
                    </div>
                  )}
                </div>

                {/* Checklist D11 của bài viết */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      selectedIngredientCount >= 1
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span>{selectedIngredientCount >= 1 ? '✅' : '❌'}</span>
                      <span>Số nguyên liệu hiện có:</span>
                    </div>
                    <span className="font-extrabold text-sm">{selectedIngredientCount}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      selectedStepCount >= 1
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span>{selectedStepCount >= 1 ? '✅' : '❌'}</span>
                      <span>Số bước nấu hiện có:</span>
                    </div>
                    <span className="font-extrabold text-sm">{selectedStepCount}</span>
                  </div>
                </div>

                <div className="text-xs text-neutral-500">
                  {isD11Satisfied ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ Bài viết đủ điều kiện xuất bản theo Quyết định D11. Bạn có thể bật công tắc tự do.
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold">
                      ⚠ Bài viết chưa đủ điều kiện D11. Khi thử gạt công tắc sang Published, Modal cảnh báo sẽ bật lên!
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PHẦN 2: INTERACTIVE SANDBOX (GIẢ LẬP NHANH CÁC TÌNH HUỐNG D11) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-sm font-bold">
                2
              </span>
              Khu Vực Thử Nghiệm Tình Huống Giả Lập D11 (Interactive Sandbox)
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Tùy biến nhanh số lượng nguyên liệu và bước nấu để kiểm tra phản ứng của Modal D11 trong mọi kịch bản.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Bộ điều khiển nguyên liệu */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 uppercase">
                  🥗 Số lượng nguyên liệu
                </span>
                <span className="text-sm font-extrabold text-neutral-900 px-2.5 py-0.5 rounded-lg bg-white border">
                  {sandboxIngredients}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSandboxIngredients((prev) => Math.max(0, prev - 1))}
                  className="w-9 h-9 rounded-xl bg-white border border-neutral-300 font-bold hover:bg-neutral-100 transition"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={sandboxIngredients}
                  onChange={(e) => setSandboxIngredients(parseInt(e.target.value, 10))}
                  className="w-full accent-orange-600"
                />
                <button
                  type="button"
                  onClick={() => setSandboxIngredients((prev) => prev + 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-neutral-300 font-bold hover:bg-neutral-100 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Bộ điều khiển bước nấu */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 uppercase">
                  🍳 Số lượng bước nấu
                </span>
                <span className="text-sm font-extrabold text-neutral-900 px-2.5 py-0.5 rounded-lg bg-white border">
                  {sandboxSteps}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSandboxSteps((prev) => Math.max(0, prev - 1))}
                  className="w-9 h-9 rounded-xl bg-white border border-neutral-300 font-bold hover:bg-neutral-100 transition"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={sandboxSteps}
                  onChange={(e) => setSandboxSteps(parseInt(e.target.value, 10))}
                  className="w-full accent-orange-600"
                />
                <button
                  type="button"
                  onClick={() => setSandboxSteps((prev) => prev + 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-neutral-300 font-bold hover:bg-neutral-100 transition"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Nút kích hoạt kiểm tra */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-orange-50/60 border border-orange-200">
            <div className="text-xs text-neutral-700">
              Trạng thái mô phỏng:{' '}
              <span
                className={`font-bold px-2 py-0.5 rounded-full ${
                  sandboxStatus === 'Published'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {sandboxStatus}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSandboxStatus('Draft')}
                className="px-4 py-2 rounded-xl border border-neutral-300 bg-white text-xs font-semibold hover:bg-neutral-100 transition"
              >
                Đặt về Draft
              </button>
              <button
                type="button"
                onClick={handleSandboxPublishAttempt}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-700 transition"
              >
                Thử Nghiệm Kích Hoạt Xuất Bản
              </button>
            </div>
          </div>
        </div>

        {/* PHẦN 3: BẢNG TIÊU CHÍ NGHIỆM THU (TEST MATRIX) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-neutral-900">
            Ma Trận Kịch Bản Kiểm Thử Quyết Định D11 (Test Matrix)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-700">
                  <th className="py-2.5 px-3 font-bold">Kịch bản</th>
                  <th className="py-2.5 px-3 font-bold">Nguyên liệu</th>
                  <th className="py-2.5 px-3 font-bold">Bước nấu</th>
                  <th className="py-2.5 px-3 font-bold">Hành vi mong đợi</th>
                  <th className="py-2.5 px-3 font-bold text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-600">
                <tr>
                  <td className="py-2.5 px-3 font-medium">TC1: Thiếu cả hai</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">0</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">0</td>
                  <td className="py-2.5 px-3">Bật Modal D11, hiển thị cả 2 điều kiện chưa đạt, chặn gửi API</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Đã kiểm thử ✓</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">TC2: Có nguyên liệu, thiếu bước</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">$\ge 1$</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">0</td>
                  <td className="py-2.5 px-3">Bật Modal D11, nguyên liệu tích xanh, bước nấu tích đỏ</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Đã kiểm thử ✓</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">TC3: Có bước, thiếu nguyên liệu</td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">0</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">$\ge 1$</td>
                  <td className="py-2.5 px-3">Bật Modal D11, nguyên liệu tích đỏ, bước nấu tích xanh</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Đã kiểm thử ✓</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">TC4: Đủ cả 2 điều kiện</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">$\ge 1$</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">$\ge 1$</td>
                  <td className="py-2.5 px-3">Không mở modal, gọi API PATCH /publish thành công, badge xanh</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Đã kiểm thử ✓</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">TC5: Gỡ bài về bản nháp</td>
                  <td className="py-2.5 px-3">-</td>
                  <td className="py-2.5 px-3">-</td>
                  <td className="py-2.5 px-3">Gọi API PATCH /unpublish thành công, badge chuyển về Draft</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Đã kiểm thử ✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal D11 cho Sandbox */}
      <PublishRequirementModal
        isOpen={isSandboxModalOpen}
        onClose={() => setIsSandboxModalOpen(false)}
        ingredientCount={sandboxIngredients}
        stepCount={sandboxSteps}
      />
    </div>
  );
}
