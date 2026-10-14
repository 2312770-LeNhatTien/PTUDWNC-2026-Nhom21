// ============================================================================
// COMPONENT: IngredientListEditor.tsx
// Chức năng: Quản lý danh sách nguyên liệu món ăn (Thêm, Sửa, Xóa, Sắp xếp)
// Tính năng nổi bật Tuần 5:
//   1. Nhập liên tục bằng phím Enter (nhập xong gõ Enter tự động thêm và nhảy focus)
//   2. Tuân thủ Quyết định Kiến trúc D10: Hỗ trợ null Quantity & Unit cho gia vị
// Tác giả: Nguyễn Đình Tuấn (MSSV: 2312792)
// ============================================================================

'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { recipesApi } from '@/lib/api/recipes';
import type { RecipeIngredientDto } from '@/types/api';

export interface IngredientListEditorProps {
  recipeId?: string; // ID món ăn nếu đang ở chế độ gọi API trực tiếp
  initialIngredients?: RecipeIngredientDto[]; // Danh sách nguyên liệu ban đầu
  onIngredientsChange?: (ingredients: RecipeIngredientDto[]) => void; // Callback khi danh sách thay đổi
  readOnly?: boolean; // Chế độ chỉ xem
}

export default function IngredientListEditor({
  recipeId,
  initialIngredients = [],
  onIngredientsChange,
  readOnly = false,
}: IngredientListEditorProps) {
  // 1. Quản lý danh sách nguyên liệu
  const [ingredients, setIngredients] = useState<RecipeIngredientDto[]>(initialIngredients);

  // 2. Trạng thái Form thêm nguyên liệu mới
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isTasteSeasoning, setIsTasteSeasoning] = useState<boolean>(false);

  // 3. Trạng thái chỉnh sửa trực tiếp 1 nguyên liệu
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editIsTasteSeasoning, setEditIsTasteSeasoning] = useState<boolean>(false);

  // 4. Trạng thái thông báo và tải dữ liệu
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 5. Ref để tự động Focus vào ô Tên khi nhập liên tục bằng phím Enter
  const nameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const unitInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ initialIngredients nếu props thay đổi từ ngoài
  useEffect(() => {
    if (initialIngredients && initialIngredients.length > 0) {
      setIngredients(initialIngredients);
    }
  }, [initialIngredients]);

  // Thông báo toast tự tắt sau 3 giây
  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Trích xuất thông báo lỗi chi tiết từ Backend (RFC 7807)
  const extractError = (err: unknown, defaultMsg: string) => {
    const errObj = err as {
      response?: {
        status?: number;
        data?: { detail?: string; title?: string; message?: string };
      };
      message?: string;
    };
    if (errObj.response?.status === 403) {
      return (
        errObj.response?.data?.detail ||
        "Bạn không có quyền chỉnh sửa công thức này. Hãy đăng nhập tài khoản Admin (admin@culinary.local / Admin@123) hoặc Tác giả món ăn."
      );
    }
    return (
      errObj.response?.data?.detail ||
      errObj.response?.data?.title ||
      errObj.response?.data?.message ||
      errObj.message ||
      defaultMsg
    );
  };

  // Cập nhật state nội bộ và bắn callback ra ngoài
  const updateList = (newList: RecipeIngredientDto[]) => {
    setIngredients(newList);
    if (onIngredientsChange) {
      onIngredientsChange(newList);
    }
  };

  // Xử lý thêm nguyên liệu
  const handleAddIngredient = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Vui lòng nhập tên nguyên liệu.', true);
      nameInputRef.current?.focus();
      return;
    }

    if (trimmedName.length > 100) {
      showToast('Tên nguyên liệu không được vượt quá 100 ký tự.', true);
      return;
    }

    // Tuân thủ Quyết định D10: nếu là gia vị nêm nếm hoặc để trống -> gửi null
    const parsedQty = isTasteSeasoning || !quantity.trim() ? null : parseFloat(quantity.trim());
    const parsedUnit = isTasteSeasoning || !unit.trim() ? null : unit.trim();
    const parsedNotes = notes.trim() ? notes.trim() : null;

    setIsLoading(true);
    try {
      if (recipeId) {
        // Chế độ API: Gửi request lưu vào database
        const created = await recipesApi.addIngredient(recipeId, {
          name: trimmedName,
          quantity: parsedQty,
          unit: parsedUnit,
          notes: parsedNotes,
          orderIndex: ingredients.length + 1,
        });
        updateList([...ingredients, created]);
      } else {
        // Chế độ Form: Tạo DTO cục bộ
        const localItem: RecipeIngredientDto = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ing-${Date.now()}`,
          name: trimmedName,
          quantity: parsedQty !== null ? parsedQty : undefined,
          unit: parsedUnit !== null ? parsedUnit : undefined,
          notes: parsedNotes !== null ? parsedNotes : undefined,
          orderIndex: ingredients.length + 1,
        };
        updateList([...ingredients, localItem]);
      }

      // Reset form sau khi thêm
      setName('');
      setQuantity('');
      setUnit('');
      setNotes('');
      setIsTasteSeasoning(false);
      showToast(`Đã thêm nguyên liệu "${trimmedName}" thành công!`);

      // TỰ ĐỘNG FOCUS LẠI VÀO Ô TÊN ĐỂ NHẬP DÒNG TIẾP THEO
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    } catch (err: unknown) {
      const msg = extractError(err, 'Lỗi khi thêm nguyên liệu.');
      showToast(msg, true);
    } finally {
      setIsLoading(false);
    }
  };

  // Bắt sự kiện phím Enter để nhập liên tục
  const handleKeyDownAdd = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Ngăn submit form cha
      handleAddIngredient();
    }
  };

  // Bắt đầu chỉnh sửa 1 nguyên liệu
  const handleStartEdit = (item: RecipeIngredientDto) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity !== undefined && item.quantity !== null ? item.quantity.toString() : '');
    setEditUnit(item.unit || '');
    setEditNotes(item.notes || '');
    setEditIsTasteSeasoning(item.quantity === null || item.quantity === undefined);
  };

  // Lưu chỉnh sửa nguyên liệu
  const handleSaveEdit = async (id: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      showToast('Tên nguyên liệu không được để trống.', true);
      return;
    }

    const parsedQty = editIsTasteSeasoning || !editQuantity.trim() ? null : parseFloat(editQuantity.trim());
    const parsedUnit = editIsTasteSeasoning || !editUnit.trim() ? null : editUnit.trim();
    const parsedNotes = editNotes.trim() ? editNotes.trim() : null;

    setIsLoading(true);
    try {
      if (recipeId) {
        const updated = await recipesApi.updateIngredient(recipeId, id, {
          name: trimmedName,
          quantity: parsedQty,
          unit: parsedUnit,
          notes: parsedNotes,
        });
        updateList(ingredients.map((ing) => (ing.id === id ? updated : ing)));
      } else {
        updateList(
          ingredients.map((ing) =>
            ing.id === id
              ? {
                  ...ing,
                  name: trimmedName,
                  quantity: parsedQty !== null ? parsedQty : undefined,
                  unit: parsedUnit !== null ? parsedUnit : undefined,
                  notes: parsedNotes !== null ? parsedNotes : undefined,
                }
              : ing
          )
        );
      }
      setEditingId(null);
      showToast('Đã cập nhật nguyên liệu thành công!');
    } catch (err: unknown) {
      const msg = extractError(err, 'Lỗi khi cập nhật nguyên liệu.');
      showToast(msg, true);
    } finally {
      setIsLoading(false);
    }
  };

  // Bắt sự kiện phím Enter khi đang sửa
  const handleKeyDownEdit = (e: KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  // Xóa nguyên liệu khỏi danh sách
  const handleDeleteIngredient = async (id: string, itemName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nguyên liệu "${itemName}" không?`)) {
      return;
    }

    setIsLoading(true);
    try {
      if (recipeId) {
        await recipesApi.deleteIngredient(recipeId, id);
      }
      const filtered = ingredients
        .filter((ing) => ing.id !== id)
        .map((ing, idx) => ({ ...ing, orderIndex: idx + 1 }));
      updateList(filtered);
      showToast(`Đã xóa nguyên liệu "${itemName}".`);
    } catch (err: unknown) {
      const msg = extractError(err, 'Lỗi khi xóa nguyên liệu.');
      showToast(msg, true);
    } finally {
      setIsLoading(false);
    }
  };

  // Di chuyển thứ tự (Lên / Xuống)
  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ingredients.length) return;

    const reordered = [...ingredients];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((ing, idx) => ({ ...ing, orderIndex: idx + 1 }));
    updateList(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 md:p-6 transition-all">
      {/* Header component */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-100 gap-2">
        <div>
          <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
            <span className="text-xl">🥕</span> Danh Sách Nguyên Liệu Món Ăn
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
              {ingredients.length} nguyên liệu
            </span>
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Tuân thủ Quyết định D10: Cho phép gia vị nêm nếm không bắt buộc định lượng.
          </p>
        </div>

        {/* Mẹo phím Enter */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/60 rounded-lg text-xs text-amber-800">
          <span>⌨️</span>
          <span>
            Nhập nhanh: Nhấn <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-[11px] font-mono font-bold shadow-2xs">Enter</kbd> để thêm liên tục
          </span>
        </div>
      </div>

      {/* Thông báo thông điệp */}
      {successMsg && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900 text-xs">✕</button>
        </div>
      )}

      {/* DANH SÁCH NGUYÊN LIỆU ĐÃ THÊM */}
      <div className="mt-5 space-y-2">
        {ingredients.length === 0 ? (
          <div className="py-8 text-center bg-neutral-50/60 border border-dashed border-neutral-200 rounded-xl">
            <div className="text-3xl mb-1">🥗</div>
            <p className="text-sm font-medium text-neutral-600">Chưa có nguyên liệu nào được thêm.</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Hãy nhập thông tin ở form bên dưới và nhấn Enter để thêm nguyên liệu đầu tiên!
            </p>
          </div>
        ) : (
          <div className="border border-neutral-200/70 rounded-xl overflow-hidden divide-y divide-neutral-100 bg-white">
            {ingredients.map((item, index) => {
              const isEditing = editingId === item.id;
              const hasQuantity = item.quantity !== undefined && item.quantity !== null;
              const hasUnit = !!item.unit;

              if (isEditing) {
                return (
                  <div key={item.id} className="p-3 bg-amber-50/40 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-4">
                        <label className="text-[11px] font-semibold text-neutral-600">Tên nguyên liệu *</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => handleKeyDownEdit(e, item.id)}
                          className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                          autoFocus
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-semibold text-neutral-600">Số lượng</label>
                        <input
                          type="number"
                          step="0.1"
                          disabled={editIsTasteSeasoning}
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          onKeyDown={(e) => handleKeyDownEdit(e, item.id)}
                          placeholder={editIsTasteSeasoning ? 'N/A' : '200'}
                          className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-neutral-100 bg-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-semibold text-neutral-600">Đơn vị</label>
                        <input
                          type="text"
                          disabled={editIsTasteSeasoning}
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                          onKeyDown={(e) => handleKeyDownEdit(e, item.id)}
                          placeholder={editIsTasteSeasoning ? 'N/A' : 'g, ml...'}
                          className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-neutral-100 bg-white"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-[11px] font-semibold text-neutral-600">Ghi chú thêm</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          onKeyDown={(e) => handleKeyDownEdit(e, item.id)}
                          placeholder="Thái sợi mỏng..."
                          className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-amber-900 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editIsTasteSeasoning}
                          onChange={(e) => {
                            setEditIsTasteSeasoning(e.target.checked);
                            if (e.target.checked) {
                              setEditQuantity('');
                              setEditUnit('');
                            }
                          }}
                          className="w-3.5 h-3.5 text-amber-600 rounded border-neutral-300 focus:ring-amber-500"
                        />
                        <span>Gia vị nêm vừa ăn (Quyết định D10)</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-200/60 rounded-md font-medium"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold shadow-2xs"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50/80 transition-colors group"
                >
                  {/* Thứ tự & Tên */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 flex items-center justify-center text-[11px] font-mono font-semibold text-neutral-400 bg-neutral-100 rounded-full shrink-0">
                      {index + 1}
                    </span>
                    <div className="truncate">
                      <span className="text-sm font-semibold text-neutral-800">{item.name}</span>
                      {item.notes && (
                        <span className="text-xs text-neutral-400 ml-2 italic">({item.notes})</span>
                      )}
                    </div>
                  </div>

                  {/* Định lượng (Quyết định D10) */}
                  <div className="flex items-center gap-3 shrink-0">
                    {hasQuantity || hasUnit ? (
                      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md">
                        {hasQuantity ? item.quantity : ''} {hasUnit ? item.unit : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-md">
                        <span>✨</span> Nêm vừa ăn (D10)
                      </span>
                    )}

                    {/* Nút hành động */}
                    {!readOnly && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, 'up')}
                          disabled={index === 0}
                          title="Di chuyển lên"
                          className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:hover:text-neutral-400"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, 'down')}
                          disabled={index === ingredients.length - 1}
                          title="Di chuyển xuống"
                          className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:hover:text-neutral-400"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Chỉnh sửa"
                          className="p-1 text-neutral-400 hover:text-amber-600"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteIngredient(item.id, item.name)}
                          title="Xóa nguyên liệu"
                          className="p-1 text-neutral-400 hover:text-rose-600"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FORM NHẬP NGUYÊN LIỆU MỚI (TÍNH NĂNG ENTER LIÊN TỤC) */}
      {!readOnly && (
        <div className="mt-5 pt-4 border-t border-neutral-100 bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/70">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <span>➕</span> Thêm nguyên liệu mới:
            </span>
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isTasteSeasoning}
                onChange={(e) => {
                  setIsTasteSeasoning(e.target.checked);
                  if (e.target.checked) {
                    setQuantity('');
                    setUnit('');
                  }
                }}
                className="w-3.5 h-3.5 text-amber-600 rounded border-neutral-300 focus:ring-amber-500"
              />
              <span className="font-medium text-amber-900">Gia vị nêm vừa ăn (Không cần định lượng - D10)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Tên nguyên liệu */}
            <div className="sm:col-span-5">
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDownAdd}
                placeholder="Tên nguyên liệu (VD: Thịt ba chỉ, Nước mắm)..."
                className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                maxLength={100}
              />
            </div>

            {/* Số lượng */}
            <div className="sm:col-span-2">
              <input
                ref={quantityInputRef}
                type="number"
                step="0.1"
                disabled={isTasteSeasoning}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={handleKeyDownAdd}
                placeholder={isTasteSeasoning ? 'Vừa ăn' : 'Số lượng (300)'}
                className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-neutral-100 disabled:text-neutral-400 bg-white"
              />
            </div>

            {/* Đơn vị */}
            <div className="sm:col-span-2">
              <input
                ref={unitInputRef}
                type="text"
                disabled={isTasteSeasoning}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                onKeyDown={handleKeyDownAdd}
                placeholder={isTasteSeasoning ? 'Tùy thích' : 'Đơn vị (g, ml)'}
                className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-neutral-100 disabled:text-neutral-400 bg-white"
                maxLength={20}
              />
            </div>

            {/* Ghi chú */}
            <div className="sm:col-span-3">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={handleKeyDownAdd}
                placeholder="Ghi chú (rửa sạch, thái mỏng...)"
                className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                maxLength={200}
              />
            </div>
          </div>

          {/* Hàng nút bấm và hướng dẫn */}
          <div className="flex items-center justify-between mt-3 pt-2">
            <span className="text-[11px] text-neutral-400">
              💡 Gõ thông tin rồi nhấn <span className="text-amber-700 font-semibold">Enter</span> để thêm liên tục không cần chạm chuột.
            </span>

            <button
              type="button"
              onClick={handleAddIngredient}
              disabled={isLoading || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isLoading ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <span>Thêm (Enter)</span>
                  <span className="text-[10px] bg-amber-700/60 px-1 py-0.5 rounded">↵</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
