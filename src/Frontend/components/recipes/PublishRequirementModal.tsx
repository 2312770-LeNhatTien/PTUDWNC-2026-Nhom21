'use client';

import React, { useEffect } from 'react';

/**
 * Thuộc tính đầu vào cho Modal kiểm tra điều kiện xuất bản D11
 */
interface PublishRequirementModalProps {
  /** Trạng thái mở hoặc đóng modal */
  isOpen: boolean;
  /** Hàm callback để đóng modal */
  onClose: () => void;
  /** Số lượng nguyên liệu hiện có trong công thức */
  ingredientCount: number;
  /** Số lượng bước nấu ăn hiện có trong công thức */
  stepCount: number;
  /** Callback tùy chọn khi người dùng bấm "Tiếp tục chỉnh sửa" */
  onContinueEditing?: () => void;
}

/**
 * ============================================================================
 * MODAL CẢNH BÁO ĐIỀU KIỆN XUẤT BẢN THEO QUYẾT ĐỊNH D11 (FR-RCP-005 UI)
 * ============================================================================
 * Tuân thủ nghiêm ngặt Quyết định Kiến trúc D11:
 * - Bắt buộc công thức phải có ít nhất 1 nguyên liệu (Ingredients.Count >= 1)
 * - Bắt buộc công thức phải có ít nhất 1 bước chế biến (Steps.Count >= 1)
 * 
 * Tác giả: Lâm Văn Đức (MSSV: 2314299)
 * Nhóm 21 - PTUDWNC-2026
 */
export default function PublishRequirementModal({
  isOpen,
  onClose,
  ingredientCount,
  stepCount,
  onContinueEditing,
}: PublishRequirementModalProps) {
  // Lắng nghe phím ESC để đóng modal thuận tiện
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Khóa thanh cuộn trang web khi modal đang hiển thị
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const hasEnoughIngredients = ingredientCount >= 1;
  const hasEnoughSteps = stepCount >= 1;

  const handleContinue = () => {
    onClose();
    if (onContinueEditing) {
      onContinueEditing();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="d11-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Lớp nền mờ tối màu (Backdrop) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
      />

      {/* Nội dung hộp thoại chính */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden transform transition-all z-10 scale-100 animate-in zoom-in-95 duration-200">
        {/* Header trang trí màu hổ phách/cam */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 id="d11-modal-title" className="text-lg font-bold">
                Chưa Đủ Điều Kiện Xuất Bản
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                Quy định bảo đảm chất lượng nội dung (Quyết định D11)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Thân hộp thoại */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Để bảo đảm công thức có giá trị thực hành cao cho cộng đồng người nấu ăn, bài viết chỉ có thể chuyển sang trạng thái{' '}
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Đã xuất bản (Published)
            </span>{' '}
            khi thỏa mãn đầy đủ các tiêu chuẩn bên dưới:
          </p>

          {/* Danh sách checklist điều kiện D11 */}
          <div className="space-y-3">
            {/* Tiêu chí 1: Danh sách nguyên liệu */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                hasEnoughIngredients
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  hasEnoughIngredients
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {hasEnoughIngredients ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-neutral-900">
                    Danh sách nguyên liệu (Ingredients)
                  </h4>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      hasEnoughIngredients
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {ingredientCount} / tối thiểu 1
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  {hasEnoughIngredients
                    ? `Đạt yêu cầu: Công thức đã có ${ingredientCount} nguyên liệu được khai báo.`
                    : 'Chưa đạt: Cần bổ sung ít nhất 1 nguyên liệu nấu ăn cụ thể.'}
                </p>
              </div>
            </div>

            {/* Tiêu chí 2: Các bước thực hiện */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                hasEnoughSteps
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  hasEnoughSteps
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {hasEnoughSteps ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-neutral-900">
                    Các bước chế biến (Cooking Steps)
                  </h4>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      hasEnoughSteps
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {stepCount} / tối thiểu 1
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  {hasEnoughSteps
                    ? `Đạt yêu cầu: Công thức đã có ${stepCount} bước hướng dẫn chi tiết.`
                    : 'Chưa đạt: Cần bổ sung ít nhất 1 bước hướng dẫn thực hiện món ăn.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200/80 text-xs text-neutral-500 flex items-center gap-2">
            <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Công thức chưa xuất bản vẫn được lưu an toàn dưới dạng <strong>Bản nháp (Draft)</strong> để bạn tiếp tục chỉnh sửa bất cứ lúc nào.
            </span>
          </div>
        </div>

        {/* Nút thao tác dưới chân modal */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-semibold hover:bg-neutral-100 transition"
          >
            Đóng lại
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-700 transition flex items-center justify-center gap-2"
          >
            <span>Tiếp tục chỉnh sửa</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
