// ============================================================================
// Frontend API module cho Recipes (FR-RCP)
// Bổ sung: FR-RCP-010 Quản lý các bước nấu (Nguyễn Đình Tuấn - 2312792)
// ============================================================================

import apiClient from "./client";
import type { ApiResponse, RecipeListItemDto, RecipeDetailDto, RecipeDifficulty, RecipeStepDto } from "@/types/api";

export interface GetRecipesParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
  maxCookTime?: number;
  maxTotalTime?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  sort?: string;
}

export const recipesApi = {
  // FR-RCP-001: GET /api/v1/recipes
  getAll: async (params?: GetRecipesParams): Promise<{ items: RecipeListItemDto[]; total: number }> => {
    try {
      const res = await apiClient.get<ApiResponse<RecipeListItemDto[]>>("/api/v1/recipes", { params });
      return { items: res.data?.data || [], total: res.data?.meta?.total || 0 };
    } catch {
      return { items: [], total: 0 };
    }
  },

  // FR-RCP-002: GET /api/v1/recipes/{slug}
  getBySlug: async (slug: string): Promise<RecipeDetailDto | null> => {
    try {
      const res = await apiClient.get<ApiResponse<RecipeDetailDto>>(`/api/v1/recipes/${slug}`);
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  // ==========================================================================
  // FR-RCP-010: QUẢN LÝ CÁC BƯỚC NẤU (NGUYỄN ĐÌNH TUẤN - 2312792)
  // ==========================================================================

  // 1. Lấy danh sách các bước nấu của công thức
  getSteps: async (recipeId: string): Promise<RecipeStepDto[]> => {
    const res = await apiClient.get<ApiResponse<RecipeStepDto[]>>(`/api/v1/recipes/${recipeId}/steps`);
    return res.data?.data || [];
  },

  // 2. Thêm bước nấu mới (D9: StepNumber tùy chọn)
  addStep: async (
    recipeId: string,
    data: {
      title: string;
      description: string;
      stepNumber?: number;
      timerMinutes?: number;
      imageUrl?: string;
    }
  ): Promise<RecipeStepDto> => {
    const res = await apiClient.post<ApiResponse<RecipeStepDto>>(`/api/v1/recipes/${recipeId}/steps`, data);
    return res.data?.data;
  },

  // 3. Cập nhật bước nấu đã có
  updateStep: async (
    recipeId: string,
    stepId: string,
    data: {
      title: string;
      description: string;
      stepNumber?: number;
      timerMinutes?: number;
      imageUrl?: string;
    }
  ): Promise<RecipeStepDto> => {
    const res = await apiClient.put<ApiResponse<RecipeStepDto>>(`/api/v1/recipes/${recipeId}/steps/${stepId}`, data);
    return res.data?.data;
  },

  // 4. Xóa bước nấu khỏi công thức
  deleteStep: async (recipeId: string, stepId: string): Promise<boolean> => {
    await apiClient.delete(`/api/v1/recipes/${recipeId}/steps/${stepId}`);
    return true;
  },

  // ==========================================================================
  // FR-RCP-005: XUẤT BẢN / HỦY XUẤT BẢN CÔNG THỨC (LÂM VĂN ĐỨC - 2314299)
  // ==========================================================================

  // 5. Xuất bản công thức (kiểm tra điều kiện D11)
  publish: async (recipeId: string): Promise<RecipeDetailDto> => {
    const res = await apiClient.patch<ApiResponse<RecipeDetailDto>>(`/api/v1/recipes/${recipeId}/publish`);
    return res.data?.data;
  },

  // 6. Hủy xuất bản công thức về Draft
  unpublish: async (recipeId: string): Promise<RecipeDetailDto> => {
    const res = await apiClient.patch<ApiResponse<RecipeDetailDto>>(`/api/v1/recipes/${recipeId}/unpublish`);
    return res.data?.data;
  },
};

