'use client';

// ============================================================================
// COMPONENT: IngredientChecklist (Checklist nguyên liệu tương tác)
// CHỨC NĂNG: Hỗ trợ người nấu tick chọn nguyên liệu khi chuẩn bị nấu ăn (FR-RCP-002)
// THÀNH VIÊN PHỤ TRÁCH: Lê Nhật Tiến (MSSV: 2312770)
// ============================================================================

import React, { useState } from 'react';
import type { RecipeIngredientDto } from '@/types/api';

interface IngredientChecklistProps {
  /** Danh sách nguyên liệu lấy từ RecipeDetailDto */
  ingredients: RecipeIngredientDto[];
  /** Số lượng khẩu phần ăn mặc định của công thức */
  defaultServings?: number;
}

export default function IngredientChecklist({
  ingredients,
  defaultServings = 4,
}: IngredientChecklistProps) {
  // Set lưu danh sách ID các nguyên liệu đã được người dùng đánh dấu hoàn thành
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Hệ số khẩu phần ăn cho phép người dùng điều chỉnh tỷ lệ nguyên liệu nấu thực tế
  const [servings, setServings] = useState<number>(defaultServings);

  // Đảo trạng thái tick của một nguyên liệu cụ thể
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Chọn hoặc bỏ chọn toàn bộ nguyên liệu một lượt
  const toggleAll = () => {
    if (checkedIds.size === ingredients.length) {
      setCheckedIds(new Set()); // Bỏ chọn tất cả
    } else {
      setCheckedIds(new Set(ingredients.map((item) => item.id))); // Chọn tất cả
    }
  };

  // Tính tỷ lệ nguyên liệu đã chuẩn bị
  const totalCount = ingredients.length;
  const checkedCount = checkedIds.size;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const ratio = defaultServings > 0 ? servings / defaultServings : 1;

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Chưa có thông tin nguyên liệu cho món ăn này.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6 shadow-xs">
      {/* ── HEADER CỦA CHECKLIST NGUYÊN LIỆU ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <span>🥗</span> Nguyên liệu cần chuẩn bị
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Đánh dấu tick vào nguyên liệu khi bạn đã chuẩn bị xong
          </p>
        </div>

        {/* Bộ điều chỉnh khẩu phần ăn (Servings multiplier) */}
        <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200/60">
          <span className="text-xs font-medium text-neutral-600">Khẩu phần:</span>
          <button
            type="button"
            onClick={() => setServings((prev) => Math.max(1, prev - 1))}
            className="h-6 w-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors shadow-2xs"
            title="Giảm khẩu phần"
          >
            -
          </button>
          <span className="text-xs font-bold text-orange-600 px-1 min-w-[20px] text-center">
            {servings}
          </span>
          <button
            type="button"
            onClick={() => setServings((prev) => prev + 1)}
            className="h-6 w-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors shadow-2xs"
            title="Tăng khẩu phần"
          >
            +
          </button>
          <span className="text-xs text-neutral-500">người</span>
        </div>
      </div>

      {/* ── THANH TIẾN ĐỘ CHUẨN BỊ NGUYÊN LIỆU ── */}
      <div className="py-3">
        <div className="flex items-center justify-between text-xs font-medium text-neutral-600 mb-1.5">
          <span>
            Đã chuẩn bị: <strong className="text-neutral-900">{checkedCount}/{totalCount}</strong> nguyên liệu
          </span>
          <div className="flex items-center gap-3">
            <span className="text-orange-600 font-bold">{progressPercent}%</span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold hover:underline"
            >
              {checkedIds.size === totalCount ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── DANH SÁCH CHECKLIST CÁC NGUYÊN LIỆU ── */}
      <ul className="mt-2 divide-y divide-neutral-100">
        {ingredients.map((item) => {
          const isChecked = checkedIds.has(item.id);

          // Tính toán định lượng theo khẩu phần ăn nếu có
          let displayQuantity = '';
          if (item.quantity !== null && item.quantity !== undefined) {
            const scaled = Number((item.quantity * ratio).toFixed(2));
            // Định dạng số tròn nếu không có phần thập phân
            displayQuantity = scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toString();
          }

          return (
            <li
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`group flex items-center justify-between py-3 px-2 rounded-xl cursor-pointer transition-colors select-none ${
                isChecked
                  ? 'bg-neutral-50/80 text-neutral-400'
                  : 'hover:bg-orange-50/40 text-neutral-800'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                {/* Checkbox tròn hiện đại */}
                <div
                  className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                      : 'border-neutral-300 bg-white group-hover:border-orange-400'
                  }`}
                >
                  {isChecked && (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Tên nguyên liệu & Ghi chú */}
                <div className="truncate">
                  <span
                    className={`text-sm font-medium transition-all ${
                      isChecked ? 'line-through text-neutral-400' : 'text-neutral-900'
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.notes && (
                    <span className="ml-2 text-xs text-neutral-400 italic">
                      ({item.notes})
                    </span>
                  )}
                </div>
              </div>

              {/* Định lượng & Đơn vị tính (nếu có, tuân thủ D10 nullable) */}
              {(displayQuantity || item.unit) && (
                <div
                  className={`text-xs font-semibold shrink-0 px-2.5 py-1 rounded-lg border ${
                    isChecked
                      ? 'bg-neutral-100 text-neutral-400 border-neutral-200'
                      : 'bg-orange-50 text-orange-700 border-orange-100'
                  }`}
                >
                  {displayQuantity} {item.unit || ''}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
