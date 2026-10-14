'use client';

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';

interface ImageUploaderProps {
  folder?: string;
  onUploadSuccess?: (url: string) => void;
  onDeleteSuccess?: () => void;
}

export default function ImageUploader({
  folder = 'recipes',
  onUploadSuccess,
  onDeleteSuccess,
}: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    setError(null);

    // Kiểm tra dung lượng tối đa 5MB (CONS-007)
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh vượt quá giới hạn 5MB.');
      return;
    }

    // Kiểm tra định dạng
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Chỉ chấp nhận các định dạng ảnh: JPEG, PNG, WebP, AVIF.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
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

  const getApiBaseUrl = () => {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const base = raw.replace(/\/api\/v1\/?$/, '');
    return `${base}/api/v1`;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', folder);

      const uploadUrl = `${getApiBaseUrl()}/files/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      let json: { data?: { url?: string }; detail?: string; title?: string } | null = null;
      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        // Không phải JSON
      }

      if (!response.ok) {
        throw new Error(json?.detail || json?.title || responseText || `Tải ảnh thất bại (${response.status})`);
      }

      const fileUrl = json?.data?.url;
      if (!fileUrl) {
        throw new Error('Máy chủ không trả về URL ảnh hợp lệ.');
      }

      setUploadedUrl(fileUrl);
      if (onUploadSuccess) {
        onUploadSuccess(fileUrl);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Có lỗi xảy ra khi kết nối máy chủ MinIO.');
      }
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
      const deleteUrl = `${getApiBaseUrl()}/files?fileUrl=${encodeURIComponent(uploadedUrl)}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const responseText = await response.text();
        throw new Error(responseText || 'Xóa ảnh thất bại.');
      }

      setUploadedUrl(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Có lỗi xảy ra khi xóa file.');
      }
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
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-orange-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
          <span>📸</span> Tải lên hình ảnh món ăn
        </h3>
        <p className="text-xs text-neutral-500 mt-1">
          Hỗ trợ JPG, PNG, WebP, AVIF. Kích thước tối đa 5MB mỗi ảnh.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">Đóng</button>
        </div>
      )}

      {/* Khu vực upload / Preview */}
      {!previewUrl ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-orange-500 bg-orange-50'
              : 'border-neutral-200 hover:border-orange-300 hover:bg-orange-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={onInputChange}
            className="hidden"
          />
          <div className="w-14 h-14 mx-auto mb-3 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl">
            🖼️
          </div>
          <p className="text-sm font-medium text-neutral-700">
            Kéo thả ảnh vào đây hoặc <span className="text-orange-600 underline">chọn từ thiết bị</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">Định dạng JPEG, PNG, WebP tối đa 5MB</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-neutral-100 bg-neutral-50 aspect-video flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
            />

            {/* Nút hủy chọn trước khi upload */}
            {!uploadedUrl && !isLoading && (
              <button type="button"
                onClick={resetSelection}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition text-xs"
                title="Hủy chọn"
              >
                ✕
              </button>
            )}

            {/* Nút xóa sau khi upload */}
            {uploadedUrl && !isLoading && (
              <button type="button"
                onClick={handleDelete}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full px-3 py-1.5 transition shadow-md flex items-center gap-1.5 text-xs font-medium"
                title="Xóa ảnh này"
              >
                <span>🗑️ Xóa ảnh</span>
              </button>
            )}
          </div>

          {/* Trạng thái sau khi upload thành công */}
          {uploadedUrl ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-800">
                <span className="flex items-center gap-1">
                  <span>✅</span> Đã tải ảnh lên thành công!
                </span>
                <button type="button"
                  onClick={handleCopy}
                  className="text-emerald-700 hover:text-emerald-900 underline font-semibold"
                >
                  {copied ? 'Đã sao chép!' : 'Sao chép liên kết'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={uploadedUrl}
                className="w-full text-xs font-mono bg-white border border-emerald-200 rounded-lg p-2 text-neutral-700 focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button type="button"
                onClick={resetSelection}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 bg-neutral-100 rounded-xl transition"
              >
                Chọn ảnh khác
              </button>
              <button type="button"
                onClick={handleUpload}
                disabled={isLoading}
                className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin text-sm">⌛</span> Đang tải ảnh lên...
                  </>
                ) : (
                  <>
                    <span>🚀</span> Tải ảnh lên
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
