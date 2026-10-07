'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { categoriesApi, CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/api/categories';
import type { CategoryDto, ProblemDetails } from '@/types/api';
import ImageUploader from '@/components/ui/ImageUploader';

/**
 * Hàm sinh slug preview tiếng Việt chuẩn SEO tương thích với Backend Slug ValueObject
 */
function generateSlugPreview(input: string): string {
  if (!input.trim()) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

export default function AdminCategoriesPage() {
  // Trạng thái danh sách danh mục
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Trạng thái form tạo mới
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [orderIndex, setOrderIndex] = useState<number>(0);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('url');

  // Trạng thái thao tác form
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editOrderIndex, setEditOrderIndex] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Tải danh sách danh mục từ API
  const fetchCategories = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: ProblemDetails } };
      const msg = error.response?.data?.detail || 'Không thể tải danh sách danh mục từ máy chủ.';
      setListError(msg);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Xử lý submit form tạo danh mục
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Validation cơ bản phía client
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Vui lòng nhập tên danh mục.');
      return;
    }

    if (trimmedName.length > 100) {
      setFormError('Tên danh mục không được vượt quá 100 ký tự.');
      return;
    }

    if (orderIndex < 0) {
      setFormError('Thứ tự hiển thị phải lớn hơn hoặc bằng 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateCategoryRequest = {
        name: trimmedName,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        orderIndex: Number(orderIndex),
      };

      const newCategory = await categoriesApi.create(payload);

      setSuccessMessage(`Đã tạo danh mục "${newCategory.name}" thành công! Slug: ${newCategory.slug}`);
      // Reset form
      setName('');
      setDescription('');
      setImageUrl('');
      setOrderIndex(0);

      // Làm mới lại bảng dữ liệu
      await fetchCategories();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: ProblemDetails } };
      if (error.response?.status === 409) {
        setFormError('Tên danh mục này đã tồn tại trên hệ thống. Vui lòng chọn tên khác.');
      } else if (error.response?.data?.errors?.Name) {
        setFormError(error.response.data.errors.Name.join(' '));
      } else if (error.response?.data?.detail) {
        setFormError(error.response.data.detail);
      } else {
        setFormError('Đã có lỗi xảy ra khi tạo danh mục. Vui lòng kiểm tra lại kết nối.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lọc danh mục theo tìm kiếm
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const openEdit = (category: CategoryDto) => {
    setActionError(null); setEditing(category); setEditName(category.name); setEditDescription(category.description || '');
    setEditImageUrl(category.imageUrl || ''); setEditOrderIndex(category.orderIndex);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editName.trim()) { setActionError('Tên danh mục không được để trống.'); return; }
    setIsSavingEdit(true); setActionError(null);
    try {
      const payload: UpdateCategoryRequest = { name: editName.trim(), description: editDescription.trim() || undefined, imageUrl: editImageUrl.trim() || undefined, orderIndex: Math.max(0, editOrderIndex) };
      const updated = await categoriesApi.update(editing.id, payload);
      setCategories(current => current.map(item => item.id === updated.id ? updated : item));
      setSuccessMessage(`Đã cập nhật "${updated.name}". Slug vẫn là "${updated.slug}" theo D12.`); setEditing(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: ProblemDetails } };
      setActionError(error.response?.data?.detail || 'Không thể cập nhật danh mục.');
    } finally { setIsSavingEdit(false); }
  };

  const deleteCategory = async (category: CategoryDto) => {
    if (!window.confirm(`Xóa mềm danh mục "${category.name}"? Thao tác không xóa dữ liệu vĩnh viễn.`)) return;
    setActionError(null);
    try { await categoriesApi.remove(category.id); setCategories(current => current.filter(item => item.id !== category.id)); setSuccessMessage(`Đã xóa mềm danh mục "${category.name}".`); }
    catch (err: unknown) { const error = err as { response?: { status?: number; data?: ProblemDetails } }; setActionError(error.response?.status === 409 ? 'Không thể xóa: danh mục vẫn còn công thức.' : error.response?.data?.detail || 'Không thể xóa danh mục.'); }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-neutral-500 mb-2">
            <Link href="/" className="hover:text-orange-600 transition-colors">Trang chủ</Link>
            <span>/</span>
            <span className="text-neutral-700 font-semibold">Quản trị Admin</span>
            <span>/</span>
            <span className="text-orange-600 font-semibold">Quản lý Danh mục</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Quản lý Danh Mục Ẩm Thực
              </h1>
              <p className="text-xs text-neutral-500">
                FR-CAT-003/004/005: tạo, sửa giữ slug (D12) và xóa mềm (D1)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCategories}
            disabled={isLoadingList}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition shadow-sm disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin text-orange-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Làm mới danh sách
          </button>
        </div>
      </div>

      {actionError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}

      {/* Main Grid: Form tạo mới bên trái / Danh sách bên phải */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT 1: FORM TẠO DANH MỤC MỚI (4 cols) */}
        <div className="lg:col-span-5 bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-100">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Thêm Danh Mục Mới</h2>
              <p className="text-xs text-neutral-500">Điền thông tin để tạo chuyên mục công thức</p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/50">
              FR-CAT-003
            </span>
          </div>

          {/* Thông báo lỗi form */}
          {formError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold">Lỗi tạo danh mục:</p>
                <p>{formError}</p>
              </div>
            </div>
          )}

          {/* Thông báo thành công */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-semibold">Thành công!</p>
                <p>{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên danh mục */}
            <div>
              <label htmlFor="cat-name" className="block text-xs font-semibold text-neutral-700 mb-1">
                Tên danh mục <span className="text-red-500">*</span>
              </label>
              <input
                id="cat-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Món Cuốn Thanh Mát, Bánh Xèo Miền Tây..."
                maxLength={100}
                required
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
              />
              {name && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <span className="font-medium text-neutral-400">SEO Slug tự sinh:</span>
                  <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-700 font-mono text-[10px]">
                    /categories/{generateSlugPreview(name)}
                  </code>
                </div>
              )}
            </div>

            {/* Thứ tự hiển thị */}
            <div>
              <label htmlFor="cat-order" className="block text-xs font-semibold text-neutral-700 mb-1">
                Thứ tự hiển thị (Order Index)
              </label>
              <input
                id="cat-order"
                type="number"
                min={0}
                value={orderIndex}
                onChange={(e) => setOrderIndex(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Số nhỏ hơn sẽ hiển thị trước trên thanh điều hướng và trang chủ.
              </p>
            </div>

            {/* Mô tả danh mục */}
            <div>
              <label htmlFor="cat-desc" className="block text-xs font-semibold text-neutral-700 mb-1">
                Mô tả chi tiết
              </label>
              <textarea
                id="cat-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả hương vị, đặc trưng và cảm hứng của danh mục món ăn này..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition resize-none"
              />
            </div>

            {/* Ảnh đại diện danh mục */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Ảnh đại diện danh mục
                </label>
                <div className="flex rounded-lg bg-neutral-100 p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`px-2.5 py-1 rounded-md transition ${imageInputMode === 'url' ? 'bg-white text-orange-600 shadow-xs' : 'text-neutral-600'}`}
                  >
                    Nhập Link URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`px-2.5 py-1 rounded-md transition ${imageInputMode === 'upload' ? 'bg-white text-orange-600 shadow-xs' : 'text-neutral-600'}`}
                  >
                    Tải ảnh MinIO
                  </button>
                </div>
              </div>

              {imageInputMode === 'url' ? (
                <div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    maxLength={500}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
                  />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Dán đường dẫn ảnh trực tiếp (Unsplash, Pexels hoặc CDN).
                  </p>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                  <ImageUploader
                    folder="categories"
                    onUploadSuccess={(url) => setImageUrl(url)}
                    onDeleteSuccess={() => setImageUrl('')}
                  />
                </div>
              )}

              {/* Preview ảnh đại diện */}
              {imageUrl && (
                <div className="mt-3 relative rounded-xl overflow-hidden border border-neutral-200 h-32 w-full bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview danh mục"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                    title="Xóa ảnh"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Nút gửi form */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-md shadow-orange-600/20 transition disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Đang lưu danh mục...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tạo Danh Mục Mới
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* CỘT 2: BẢNG DANH SÁCH DANH MỤC HIỆN CÓ (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-neutral-100">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Danh Sách Danh Mục ({categories.length})
              </h2>
              <p className="text-xs text-neutral-500">Các danh mục đang hoạt động trên hệ thống</p>
            </div>

            {/* Ô tìm kiếm danh mục trong bảng */}
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Tìm tên hoặc slug..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none"
              />
              <svg className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Lỗi tải danh sách */}
          {listError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs mb-4 flex items-center justify-between">
              <span>{listError}</span>
              <button
                onClick={fetchCategories}
                className="text-xs underline font-semibold text-amber-900 hover:text-amber-700 ml-2"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Trạng thái Loading */}
          {isLoadingList ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-orange-500 border-t-transparent" />
              <p className="mt-3 text-xs text-neutral-500">Đang tải danh sách danh mục từ Redis & PostgreSQL...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400 mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-neutral-700">Chưa tìm thấy danh mục nào</p>
              <p className="text-xs text-neutral-400 mt-1">
                {searchFilter ? 'Không có danh mục nào khớp với từ khóa tìm kiếm.' : 'Hãy tạo danh mục đầu tiên bằng form bên trái.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Danh mục</th>
                    <th className="py-2.5 px-2 text-center">Thứ tự</th>
                    <th className="py-2.5 px-2 text-center">Số bài viết</th>
                    <th className="py-2.5 px-3">Mô tả</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-neutral-50/80 transition-colors group">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-100 border border-neutral-200">
                            {cat.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cat.imageUrl}
                                alt={cat.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 font-bold text-xs bg-orange-50 text-orange-600">
                                {cat.name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-900 block group-hover:text-orange-600 transition-colors">
                              {cat.name}
                            </span>
                            <span className="font-mono text-[10px] text-neutral-400 block mt-0.5">
                              {cat.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-mono text-[11px] font-semibold">
                          {cat.orderIndex}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          {cat.recipeCount} bài
                        </span>
                      </td>

                      <td className="py-3 px-3 text-neutral-500 max-w-xs truncate text-[11px]" title={cat.description || ''}>
                        {cat.description || <span className="text-neutral-300 italic">Chưa có mô tả</span>}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-right">
                        <button onClick={() => openEdit(cat)} className="mr-2 rounded-lg px-2 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-50">Sửa</button>
                        <button onClick={() => deleteCategory(cat)} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50">Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Chỉnh sửa danh mục"><form onSubmit={saveEdit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-bold text-neutral-900">Sửa danh mục</h2><p className="mt-1 text-xs text-neutral-500">Slug <code className="rounded bg-neutral-100 px-1">{editing.slug}</code> được giữ nguyên theo D12.</p></div><button type="button" onClick={() => setEditing(null)} className="text-xl text-neutral-400">×</button></div>{actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}<div className="space-y-4"><label className="block text-sm font-medium">Tên<input required value={editName} onChange={e => setEditName(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-sm font-medium">Mô tả<textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="mt-1 w-full rounded-lg border p-2" rows={3} /></label><label className="block text-sm font-medium">Ảnh URL<input type="url" value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-sm font-medium">Thứ tự<input type="number" min="0" value={editOrderIndex} onChange={e => setEditOrderIndex(Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm">Hủy</button><button disabled={isSavingEdit} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div></form></div>}
    </div>
  );
}
