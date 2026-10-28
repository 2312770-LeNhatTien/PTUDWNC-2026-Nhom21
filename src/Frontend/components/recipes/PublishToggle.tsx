'use client';

import React, { useEffect, useState } from 'react';
import { recipesApi } from '@/lib/api/recipes';
import PublishRequirementModal from './PublishRequirementModal';
import { errorMessage, problemOf } from '@/lib/api/errors';

/**
 * Các thuộc tính cấu hình cho công tắc Publish / Unpublish
 */
interface PublishToggleProps {
  /** Mã định danh ID của công thức */
  recipeId: string;
  /** Trạng thái hiện tại: 'Draft' hoặc 'Published' */
  initialStatus: 'Draft' | 'Published' | string;
  /** Số lượng nguyên liệu hiện có trong công thức */
  ingredientCount: number;
  /** Số lượng bước nấu ăn hiện có trong công thức */
  stepCount: number;
  /** Callback thông báo khi trạng thái thay đổi thành công */
  onStatusChange?: (newStatus: 'Draft' | 'Published') => void;
  /** Vô hiệu hóa tương tác (ví dụ khi không phải tác giả/admin) */
  disabled?: boolean;
  /** Hiển thị nhãn và badge trạng thái đi kèm hay không (mặc định: true) */
  showLabels?: boolean;
}

/**
 * ============================================================================
 * COMPONENT CÔNG TẮC XUẤT BẢN / GỠ BẢN NHÁP (FR-RCP-005 UI)
 * ============================================================================
 * Cho phép tác giả hoặc Admin gạt công tắc để xuất bản hoặc đưa về bản nháp.
 * Kiểm tra chặt chẽ điều kiện Quyết định D11:
 * - Nếu thiếu nguyên liệu (< 1) hoặc thiếu bước (< 1): Chặn gọi API và mở Modal D11.
 * - Gọi trực tiếp API Backend PATCH /recipes/{id}/publish và /unpublish.
 * 
 * Tác giả: Lâm Văn Đức (MSSV: 2314299)
 * Nhóm 21 - PTUDWNC-2026
 */
export default function PublishToggle({
  recipeId,
  initialStatus,
  ingredientCount,
  stepCount,
  onStatusChange,
  disabled = false,
  showLabels = true,
}: PublishToggleProps) {
  // Trạng thái cục bộ của công tắc
  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus);
  useEffect(() => setCurrentStatus(initialStatus), [initialStatus]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const isPublished = currentStatus.toLowerCase() === 'published';

  // Hiển thị thông báo Toast nhanh tự ẩn sau 3.5s
  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  /**
   * Xử lý khi người dùng click vào công tắc toggle
   */
  const handleToggle = async () => {
    if (disabled || isLoading) return;

    // TRƯỜNG HỢP 1: ĐANG LÀ DRAFT -> MUỐN CHUYỂN SANG PUBLISHED
    if (!isPublished) {
      // 1. Kiểm tra điều kiện D11 ngay tại Client
      if (ingredientCount < 1 || stepCount < 1) {
        setIsModalOpen(true);
        return;
      }

      // 2. Nếu đủ điều kiện, tiến hành gọi API xuất bản
      setIsLoading(true);
      try {
        await recipesApi.publish(recipeId);
        setCurrentStatus('Published');
        showToast('Đã xuất bản công thức thành công! Mọi người có thể tìm thấy bài viết.');
        if (onStatusChange) {
          onStatusChange('Published');
        }
      } catch (err: unknown) {
        console.error('Lỗi khi xuất bản công thức:', err);
        // Kiểm tra xem backend có trả về lỗi vi phạm D11 hay không
        const errMsg = errorMessage(err);
        if (problemOf(err).errorCode === 'RECIPE_PUBLISH_INCOMPLETE') {
          setIsModalOpen(true);
        } else {
          showToast(errMsg || 'Không thể xuất bản công thức. Vui lòng thử lại sau.', true);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // TRƯỜNG HỢP 2: ĐANG LÀ PUBLISHED -> MUỐN GỠ VỀ DRAFT
    setIsLoading(true);
    try {
      await recipesApi.unpublish(recipeId);
      setCurrentStatus('Draft');
      showToast('Đã chuyển công thức về trạng thái Bản nháp (Draft).');
      if (onStatusChange) {
        onStatusChange('Draft');
      }
    } catch (err: unknown) {
      console.error('Lỗi khi gỡ xuất bản:', err);
      const errMsg = errorMessage(err);
      showToast(errMsg || 'Không thể gỡ xuất bản. Vui lòng thử lại sau.', true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-3">
      {/* Nút công tắc chuyển đổi (Switch Button) */}
      <button
        type="button"
        role="switch"
        aria-checked={isPublished}
        aria-label="Công tắc xuất bản bài viết"
        disabled={disabled || isLoading}
        onClick={handleToggle}
        className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
          isPublished ? 'bg-emerald-500' : 'bg-neutral-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="sr-only">Xuất bản công thức</span>
        {/* Nút trượt tròn */}
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isPublished ? 'translate-x-6' : 'translate-x-0'
          }`}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-3.5 w-3.5 text-neutral-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : isPublished ? (
            <svg
              className="h-3.5 w-3.5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          )}
        </span>
      </button>

      {/* Nhãn và Badge trạng thái đi kèm */}
      {showLabels && (
        <div className="flex items-center gap-2">
          {isPublished ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Đã xuất bản (Published)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Bản nháp (Draft)
            </span>
          )}
        </div>
      )}

      {/* Toast thông báo nổi */}
      {toastMessage && (
        <div
          className={`absolute left-0 top-full mt-2 z-30 px-3.5 py-2 rounded-xl text-xs font-medium shadow-lg border whitespace-nowrap animate-in fade-in slide-in-from-top-1 ${
            toastMessage.isError
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Modal cảnh báo điều kiện D11 */}
      <PublishRequirementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ingredientCount={ingredientCount}
        stepCount={stepCount}
      />
    </div>
  );
}
