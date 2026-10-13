'use client';

// ============================================================================
// COMPONENT: RecipeGalleryEditor (Quản lý bộ sưu tập ảnh công thức)
// CHỨC NĂNG: Xem gallery, chọn ảnh bìa chính (IsPrimary), thêm/xóa ảnh (FR-RCP-008)
// THÀNH VIÊN PHỤ TRÁCH: Lê Nhật Tiến (MSSV: 2312770)
// ============================================================================

import React, { useState } from 'react';
import { recipesApi } from '@/lib/api/recipes';
import ImageUploader from '@/components/ui/ImageUploader';
import type { RecipeImageDto } from '@/types/api';

interface RecipeGalleryEditorProps {
  /** ID của công thức đang được chỉnh sửa */
  recipeId: string;
  /** Danh sách ảnh ban đầu của công thức */
  initialImages?: RecipeImageDto[];
  /** Callback thông báo lên component cha khi danh sách ảnh thay đổi */
  onImagesChange?: (images: RecipeImageDto[]) => void;
}

export default function RecipeGalleryEditor({
  recipeId,
  initialImages = [],
  onImagesChange,
}: RecipeGalleryEditorProps) {
  // Danh sách hình ảnh hiện tại trong gallery
  const [images, setImages] = useState<RecipeImageDto[]>(initialImages);

  // Lưu ID của hình ảnh đang thực hiện thao tác (set primary hoặc delete) để hiển thị spinner
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);

  // Trạng thái hiển thị modal / khu vực upload ảnh mới
  const [showUploader, setShowUploader] = useState<boolean>(false);

  // Thông báo lỗi nếu có
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Thông báo thành công tạm thời
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper cập nhật state nội bộ và gọi callback thông báo ra ngoài
  const updateImagesState = (newImages: RecipeImageDto[]) => {
    setImages(newImages);
    if (onImagesChange) {
      onImagesChange(newImages);
    }
  };

  // Hiển thị thông báo thành công tự tắt sau 3 giây
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ==========================================================================
  // THAO TÁC 1: ĐẶT LÀM ẢNH ĐẠI DIỆN CHÍNH (FR-RCP-008: Set Primary Image)
  // ==========================================================================
  const handleSetPrimary = async (imageId: string) => {
    if (processingImageId) return;

    setProcessingImageId(imageId);
    setErrorMessage(null);

    try {
      // Gọi API PATCH /api/v1/recipes/{id}/images/{imageId}/primary
      await recipesApi.setPrimaryImage(recipeId, imageId);

      // Cập nhật lại trạng thái isPrimary trong danh sách local
      // Đảm bảo chỉ có DUY NHẤT ảnh được chọn là isPrimary = true
      const updatedList = images.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      }));

      updateImagesState(updatedList);
      triggerSuccess('Đã đặt làm ảnh bìa chính thành công!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMessage(
        error?.response?.data?.detail || error?.message || 'Không thể đặt ảnh làm ảnh bìa chính.'
      );
    } finally {
      setProcessingImageId(null);
    }
  };

  // ==========================================================================
  // THAO TÁC 2: XÓA ẢNH KHỎI GALLERY (FR-RCP-008: Delete Image)
  // ==========================================================================
  const handleDeleteImage = async (imageId: string) => {
    if (processingImageId) return;

    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa hình ảnh này khỏi bộ sưu tập?');
    if (!confirmed) return;

    setProcessingImageId(imageId);
    setErrorMessage(null);

    try {
      // Gọi API DELETE /api/v1/recipes/{id}/images/{imageId}
      await recipesApi.deleteImage(recipeId, imageId);

      // Lọc bỏ ảnh bị xóa khỏi danh sách local
      const remainingList = images.filter((img) => img.id !== imageId);

      // Nếu ảnh vừa xóa là ảnh chính và danh sách vẫn còn ảnh khác, tự động đặt ảnh đầu tiên làm ảnh chính
      const wasPrimary = images.find((i) => i.id === imageId)?.isPrimary;
      if (wasPrimary && remainingList.length > 0) {
        remainingList[0].isPrimary = true;
      }

      updateImagesState(remainingList);
      triggerSuccess('Đã xóa hình ảnh khỏi bộ sưu tập.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMessage(
        error?.response?.data?.detail || error?.message || 'Không thể xóa hình ảnh.'
      );
    } finally {
      setProcessingImageId(null);
    }
  };

  // ==========================================================================
  // THAO TÁC 3: THÊM ẢNH MỚI SAU KHI UPLOAD LÊN MINIO THÀNH CÔNG
  // ==========================================================================
  const handleUploadSuccess = async (uploadedUrl: string) => {
    setErrorMessage(null);

    try {
      // Tự động gán làm Primary nếu đây là ảnh đầu tiên trong bộ sưu tập
      const isFirstImage = images.length === 0;

      // Gọi API POST /api/v1/recipes/{id}/images
      const newImage = await recipesApi.addImage(recipeId, {
        originalUrl: uploadedUrl,
        altText: 'Ảnh món ăn',
        isPrimary: isFirstImage,
        orderIndex: images.length,
      });

      const updatedList = isFirstImage
        ? [newImage]
        : [...images.map((i) => (newImage.isPrimary ? { ...i, isPrimary: false } : i)), newImage];

      updateImagesState(updatedList);
      setShowUploader(false);
      triggerSuccess('Đã thêm ảnh mới vào bộ sưu tập!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMessage(
        error?.response?.data?.detail || error?.message || 'Không thể lưu ảnh vào bộ sưu tập.'
      );
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
      {/* ── HEADER CỦA BỘ SƯU TẬP ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <span>🖼️</span> Bộ sưu tập hình ảnh (Gallery)
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Tải lên nhiều góc chụp hấp dẫn và chọn 1 bức ảnh đẹp nhất làm ảnh bìa chính
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploader((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition-colors ${
            showUploader
              ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          {showUploader ? '✕ Đóng khu vực tải ảnh' : '+ Tải thêm ảnh mới'}
        </button>
      </div>

      {/* ── THÔNG BÁO LỖI / THÀNH CÔNG ── */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600"
          >
            Đóng
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <span>✅</span> {successMessage}
        </div>
      )}

      {/* ── KHU VỰC TẢI ẢNH LÊN (MINIO INTEGRATION) ── */}
      {showUploader && (
        <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/30 p-5">
          <p className="text-xs font-bold text-orange-800 mb-3 text-center">
            Tải ảnh lên máy chủ MinIO và tự động thêm vào công thức
          </p>
          <ImageUploader
            folder="recipes/gallery"
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      )}

      {/* ── LƯỚI DANH SÁCH ẢNH TRONG GALLERY ── */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img) => {
            const isProcessing = processingImageId === img.id;

            return (
              <div
                key={img.id}
                className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
                  img.isPrimary
                    ? 'border-orange-500 shadow-md ring-2 ring-orange-200'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {/* Ảnh hiển thị */}
                <img
                  src={img.originalUrl}
                  alt={img.altText || 'Ảnh công thức'}
                  className="h-full w-full object-cover"
                />

                {/* Badge "Ảnh bìa chính" */}
                {img.isPrimary && (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <span>⭐</span> Ảnh bìa
                  </div>
                )}

                {/* Lớp phủ hành động khi hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                  <div className="flex justify-end">
                    {/* Nút xóa ảnh */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDeleteImage(img.id)}
                      className="rounded-lg bg-red-600/90 hover:bg-red-700 text-white p-1.5 transition-colors text-xs disabled:opacity-50"
                      title="Xóa ảnh này khỏi bộ sưu tập"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Nút đặt làm ảnh bìa chính (chỉ hiện nếu ảnh chưa phải là primary) */}
                  <div>
                    {!img.isPrimary ? (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleSetPrimary(img.id)}
                        className="w-full rounded-xl bg-white/95 hover:bg-white text-neutral-900 px-2.5 py-1.5 text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isProcessing ? (
                          <span>⌛ Đang lưu...</span>
                        ) : (
                          <>
                            <span>⭐</span> Đặt làm ảnh bìa
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="text-center text-[11px] font-semibold text-white drop-shadow">
                        Đang là ảnh bìa chính
                      </div>
                    )}
                  </div>
                </div>

                {/* Spinner overlay khi đang xử lý API */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center z-20">
                    <span className="text-xs font-bold text-orange-600 animate-pulse">
                      Đang xử lý...
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state khi chưa có ảnh nào */
        <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl mb-3">
            📷
          </div>
          <h4 className="text-sm font-bold text-neutral-800">
            Chưa có hình ảnh nào trong bộ sưu tập
          </h4>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Hãy tải lên ít nhất một hình ảnh đẹp mắt để làm ảnh đại diện chính cho công thức nấu ăn của bạn.
          </p>
          <button
            type="button"
            onClick={() => setShowUploader(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 transition-colors shadow-xs"
          >
            + Tải ảnh đầu tiên ngay
          </button>
        </div>
      )}
    </div>
  );
}
