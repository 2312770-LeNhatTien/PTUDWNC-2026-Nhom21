import apiClient from "./client";
import type { ApiResponse, CategoryDto, CategoryDetailDto } from "@/types/api";

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  orderIndex?: number;
}

// D12: API không nhận slug. Backend luôn giữ slug cũ khi cập nhật tên.
export interface UpdateCategoryRequest extends CreateCategoryRequest {}

export const categoriesApi = {
  // FR-CAT-001: Lấy danh sách toàn bộ danh mục
  getAll: async (): Promise<CategoryDto[]> => {
    try {
      const response = await apiClient.get<ApiResponse<CategoryDto[]>>("/categories");
      return response.data.data;
    } catch {
      return [];
    }
  },

  getBySlug: async (slug: string): Promise<CategoryDetailDto> => {
    const response = await apiClient.get<ApiResponse<CategoryDetailDto>>(`/categories/${slug}`);
    return response.data.data;
  },

  // FR-CAT-003: Admin tạo danh mục mới
  create: async (data: CreateCategoryRequest): Promise<CategoryDto> => {
    const response = await apiClient.post<ApiResponse<CategoryDto>>("/categories", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateCategoryRequest): Promise<CategoryDto> => {
    const response = await apiClient.put<ApiResponse<CategoryDto>>(`/categories/${id}`, data);
    return response.data.data;
  },

  // FR-CAT-005: backend soft-delete và chặn category còn recipe.
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
