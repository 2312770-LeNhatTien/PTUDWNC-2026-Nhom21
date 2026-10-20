import axios from "axios";
import apiClient from "./client";
import type { ApiResponse, PresignedUploadResult, FileUploadResponse } from "@/types/api";

export const filesApi = {
  /**
   * FR-FILE-003: Sinh Presigned Upload URL trực tiếp từ Backend
   * Cho phép tải lên MinIO an toàn, không lộ Secret Key, hết hạn sau 15 phút
   */
  getPresignedUrl: async (
    fileName: string,
    contentType: string,
    folder: string = "general"
  ): Promise<PresignedUploadResult> => {
    const res = await apiClient.post<ApiResponse<PresignedUploadResult>>("/files/presigned-url", {
      fileName,
      contentType,
      folder,
    });
    return res.data.data;
  },

  /**
   * Upload file trực tiếp lên MinIO bằng Presigned PUT URL
   * Có thanh tiến trình (progress bar)
   */
  uploadViaPresignedUrl: async (
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<void> => {
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },

  /**
   * Phương thức tải ảnh toàn diện (Smart Upload):
   * 1. Thử dùng Presigned URL để upload trực tiếp lên MinIO (tối ưu hiệu năng, bảo mật)
   * 2. Nếu có lỗi mạng hoặc CORS, fallback tự động qua Server Proxy Stream /files/upload
   */
  uploadImage: async (
    file: File,
    folder: string = "general",
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; method: "presigned" | "proxy"; objectKey?: string }> => {
    try {
      // 1. Lấy Presigned URL
      const presigned = await filesApi.getPresignedUrl(file.name, file.type, folder);

      // 2. Upload trực tiếp bằng PUT
      await filesApi.uploadViaPresignedUrl(presigned.uploadUrl, file, onProgress);

      return {
        url: presigned.publicUrl,
        method: "presigned",
        objectKey: presigned.objectKey,
      };
    } catch (err) {
      console.warn("Presigned URL upload không khả dụng, chuyển sang Server Proxy Upload:", err);

      // Fallback: upload qua backend proxy stream
      const formData = new FormData();
      formData.append("file", file);
      if (folder) {
        formData.append("folder", folder);
      }

      const res = await apiClient.post<ApiResponse<FileUploadResponse>>("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });

      return {
        url: res.data.data.url,
        method: "proxy",
      };
    }
  },

  /**
   * FR-FILE-002: Xóa file khỏi MinIO
   */
  deleteFile: async (fileUrl: string): Promise<boolean> => {
    try {
      await apiClient.delete("/files", { params: { fileUrl } });
      return true;
    } catch {
      return false;
    }
  },
};
