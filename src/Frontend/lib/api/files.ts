import apiClient from "./client";
import type { ApiResponse, FileUploadResponse } from "@/types/api";

export const filesApi = {
  // Server kiểm tra kích thước, MIME và bytes trước khi trả URL ảnh đã lưu.
  uploadImage: async (
    file: File, folder = "general", onProgress?: (percent: number) => void
  ): Promise<{ url: string; method: "proxy" }> => {
    const data = new FormData();
    data.append("file", file);
    data.append("folder", folder);
    const res = await apiClient.post<ApiResponse<FileUploadResponse>>("/files/upload", data, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: ({ loaded, total }) => {
        if (total) onProgress?.(Math.round(loaded * 100 / total));
      },
    });
    return { url: res.data.data.url, method: "proxy" };
  },
  deleteFile: async (fileUrl: string): Promise<boolean> => {
    await apiClient.delete("/files", { params: { fileUrl } });
    return true;
  },
};
