'use client';

import React, { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import { filesApi } from '@/lib/api/files';
import FallbackImage from './FallbackImage';

interface ImageUploaderProps {
  folder?: string;
  onUploadSuccess?: (url: string) => void;
  onDeleteSuccess?: () => void;
  title?: string;
  description?: string;
}

export default function ImageUploader({
  folder = 'recipes',
  onUploadSuccess,
  onDeleteSuccess,
  title = 'Tải lên hình ảnh món ăn',
  description = 'Hỗ trợ JPEG, PNG, WebP, AVIF. Dung lượng tối đa 5MB mỗi ảnh.',
}: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'presigned' | 'proxy' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dọn dẹp Blob URL khi unmount hoặc khi chọn ảnh mới để tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (file: File) => {
    setError(null);
    setUploadProgress(0);

    // 1. Kiểm tra dung lượng tối đa 5MB (CONS-007)
    if (file.size > 5 * 1024 * 1024) {
      setError(`Kích thước file (${(file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá giới hạn cho phép 5MB.`);
      return;
    }

    // 2. Kiểm tra định dạng ảnh hợp lệ
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Định dạng file không được hỗ trợ! Chỉ chấp nhận: JPEG, PNG, WebP, AVIF.');
      return;
    }

    // 3. Sinh Blob URL để xem trước tức thì (Blob Preview)
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(blobUrl);
    setUploadedUrl(null);
    setUploadMethod(null);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn một tệp ảnh để tải lên.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Thực hiện Smart Upload (Thử Presigned URL trực tiếp -> Fallback Server Proxy)
      const result = await filesApi.uploadImage(selectedFile, folder, (percent) => {
        setUploadProgress(percent);
      });

      setUploadedUrl(result.url);
      setUploadMethod(result.method);
      setUploadProgress(100);

      if (onUploadSuccess) {
        onUploadSuccess(result.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi kết nối máy chủ MinIO.';
      setError(msg);
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!uploadedUrl) return;

    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi MinIO không?');
    if (!confirmDelete) return;

    setIsLoading(true);
    setError(null);

    try {
      await filesApi.deleteFile(uploadedUrl);

      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setUploadedUrl(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setUploadMethod(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi xóa file.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!uploadedUrl) return;
    navigator.clipboard.writeText(uploadedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetSelection = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setUploadProgress(0);
    setUploadMethod(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white rounded-3xl shadow-sm border border-orange-100">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>📸</span> {title}
        </h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-2xl flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <span>⚠️</span> {error}
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-700 font-bold ml-2 text-xs"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Khu vực Drag & Drop / Preview */}
      {!previewUrl ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-orange-500 bg-orange-50/70 scale-[1.01]'
              : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={onInputChange}
            className="hidden"
          />
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-tr from-amber-100 to-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
            🖼️
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Kéo thả ảnh vào đây hoặc <span className="text-orange-600 underline">chọn từ thiết bị</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Định dạng JPEG, PNG, WebP (Tối đa 5MB)</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">
            <FallbackImage
              src={previewUrl}
              alt="Ảnh xem trước"
              fallbackText="Không thể hiển thị ảnh xem trước"
              className="max-h-full max-w-full object-contain"
            />

            {/* Nút hủy chọn trước khi upload */}
            {!uploadedUrl && !isLoading && (
              <button
                type="button"
                onClick={resetSelection}
                className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full h-7 w-7 flex items-center justify-center transition text-xs shadow-md"
                title="Hủy chọn ảnh"
              >
                ✕
              </button>
            )}

            {/* Nút xóa sau khi upload */}
            {uploadedUrl && !isLoading && (
              <button
                type="button"
                onClick={handleDelete}
                className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full px-3 py-1.5 transition shadow-md flex items-center gap-1.5 text-xs font-semibold"
                title="Xóa ảnh khỏi MinIO"
              >
                <span>🗑️</span> Xóa ảnh
              </button>
            )}
          </div>

          {/* THANH TIẾN TRÌNH TẢI LÊN (PROGRESS BAR) */}
          {isLoading && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-orange-50/70 border border-orange-200/60 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-orange-800">
                <span className="flex items-center gap-1.5">
                  <span className="animate-spin text-sm">⏳</span> Đang tải ảnh lên MinIO...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-orange-200/50 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Trạng thái sau khi upload thành công */}
          {uploadedUrl ? (
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <span>✅</span> Tải ảnh lên MinIO thành công!
                  {uploadMethod === 'presigned' && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px]">
                      Presigned URL Direct
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-emerald-700 hover:text-emerald-900 underline font-bold"
                >
                  {copied ? 'Đã sao chép!' : 'Sao chép link'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={uploadedUrl}
                className="w-full text-xs font-mono bg-white border border-emerald-200 rounded-xl p-2.5 text-slate-700 focus:outline-none select-all"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 truncate max-w-[200px]">
                {selectedFile?.name} ({(selectedFile ? selectedFile.size / 1024 / 1024 : 0).toFixed(2)} MB)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetSelection}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition disabled:opacity-50"
                >
                  Chọn lại
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isLoading}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition flex items-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isLoading ? 'Đang gửi...' : '🚀 Bắt đầu tải lên'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
