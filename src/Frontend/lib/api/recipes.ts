// ============================================================================
// Frontend API module cho Recipes (FR-RCP)
// Hợp nhất đầy đủ các chức năng:
// - FR-RCP-001 / 002: Lấy danh sách & chi tiết công thức
// - FR-RCP-010: Quản lý các bước nấu (Nguyễn Đình Tuấn - 2312792)
// - FR-RCP-009: Quản lý nguyên liệu (Nguyễn Đình Tuấn - 2312792 - D10)
// - FR-RCP-005: Xuất bản / Hủy xuất bản (Lâm Văn Đức - 2314299)
// - FR-RCP-008: Quản lý gallery ảnh công thức (Lê Nhật Tiến - 2312770)
// ============================================================================

import apiClient from "./client";
import { isAxiosError } from "axios";
import type {
  ApiResponse,
  RecipeListItemDto,
  RecipeDetailDto,
  RecipeDifficulty,
  RecipeStepDto,
  RecipeIngredientDto,
  RecipeImageDto,
  RecipeReviewsDto,
  RecipeReviewDto,
  MyRecipeDto, RecipeEditDto, RecipeStatus, UpdateRecipeRequest, PaginationMeta,
} from "@/types/api";

export interface GetRecipesParams {
  q?: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
  maxCookTime?: number;
  maxTotalTime?: number;
  minServings?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  sort?: string;
}

export const recipesApi = {
  getMine: async (params: { page: number; pageSize: number; status?: RecipeStatus; sortBy?: string; sortOrder?: 'asc' | 'desc'; sort?: string }, signal?: AbortSignal): Promise<{ items: MyRecipeDto[]; meta: PaginationMeta }> => {
    const res = await apiClient.get<ApiResponse<MyRecipeDto[]>>("/recipes/mine", { params, signal });
    return { items: res.data.data, meta: res.data.meta! };
  },
  getForEdit: async (id: string): Promise<RecipeEditDto> => {
    const res = await apiClient.get<ApiResponse<RecipeEditDto>>(`/recipes/${id}/edit`);
    return res.data.data;
  },
  update: async (id: string, data: UpdateRecipeRequest): Promise<RecipeEditDto> => {
    const res = await apiClient.put<ApiResponse<RecipeDetailDto & { rowVersion: string; createdAt: string; updatedAt?: string }>>(`/recipes/${id}`, data);
    const recipe = res.data.data;
    return { recipe, rowVersion: recipe.rowVersion, createdAt: recipe.createdAt, updatedAt: recipe.updatedAt };
  },
  archive: async (id: string): Promise<RecipeEditDto> => {
    const res = await apiClient.patch<ApiResponse<RecipeEditDto>>(`/recipes/${id}/archive`);
    return res.data.data;
  },
  delete: async (id: string): Promise<void> => { await apiClient.delete(`/recipes/${id}`); },
  search: async (params: GetRecipesParams, signal?: AbortSignal): Promise<{ items: RecipeListItemDto[]; total: number }> => {
    const { q, ...filters } = params;
    const res = await apiClient.get<ApiResponse<RecipeListItemDto[]>>(q?.trim() ? '/recipes/search' : '/recipes', {
      params: q?.trim() ? { ...filters, q: q.trim() } : filters, signal,
    });
    return { items: res.data.data, total: res.data.meta?.total ?? 0 };
  },
  // FR-RCP-001: GET /api/v1/recipes
  getAll: async (params?: GetRecipesParams): Promise<{ items: RecipeListItemDto[]; total: number }> => {
    const res = await apiClient.get<ApiResponse<RecipeListItemDto[]>>("/recipes", { params });
    return { items: res.data.data, total: res.data.meta?.total ?? 0 };
  },

  // FR-RCP-002: GET /api/v1/recipes/{slug}
  getBySlug: async (slug: string): Promise<RecipeDetailDto | null> => {
    try {
      const res = await apiClient.get<ApiResponse<RecipeDetailDto>>(`/recipes/${slug}`);
      return res.data?.data || null;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },

  // FR-INT-001: Lấy điểm trung bình và danh sách bình luận.
  getReviews: async (recipeId: string): Promise<RecipeReviewsDto> => {
    const res = await apiClient.get<ApiResponse<RecipeReviewsDto>>(`/recipes/${recipeId}/reviews`);
    return res.data.data;
  },

  // FR-INT-001: Mỗi tài khoản được đánh giá một lần cho mỗi công thức.
  addReview: async (recipeId: string, data: { rating: number; comment: string }): Promise<RecipeReviewDto> => {
    const res = await apiClient.post<ApiResponse<RecipeReviewDto>>(`/recipes/${recipeId}/reviews`, data);
    return res.data.data;
  },

  // ==========================================================================
  // FR-RCP-010: QUẢN LÝ CÁC BƯỚC NẤU (NGUYỄN ĐÌNH TUẤN - 2312792)
  // ==========================================================================

  // 1. Lấy danh sách các bước nấu của công thức
  getSteps: async (recipeId: string): Promise<RecipeStepDto[]> => {
    const res = await apiClient.get<ApiResponse<RecipeStepDto[]>>(`/recipes/${recipeId}/steps`);
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
    const res = await apiClient.post<ApiResponse<RecipeStepDto>>(`/recipes/${recipeId}/steps`, data);
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
    const res = await apiClient.put<ApiResponse<RecipeStepDto>>(`/recipes/${recipeId}/steps/${stepId}`, data);
    return res.data?.data;
  },

  // 4. Xóa bước nấu khỏi công thức
  deleteStep: async (recipeId: string, stepId: string): Promise<boolean> => {
    await apiClient.delete(`/recipes/${recipeId}/steps/${stepId}`);
    return true;
  },

  // ==========================================================================
  // FR-RCP-009: QUẢN LÝ NGUYÊN LIỆU (NGUYỄN ĐÌNH TUẤN - 2312792)
  // TUÂN THỦ QUYẾT ĐỊNH KIẾN TRÚC D10: Nullable Quantity & Unit cho gia vị
  // ==========================================================================

  // 1. Lấy danh sách nguyên liệu của công thức
  getIngredients: async (recipeId: string): Promise<RecipeIngredientDto[]> => {
    const res = await apiClient.get<ApiResponse<RecipeIngredientDto[]>>(`/recipes/${recipeId}/ingredients`);
    return res.data?.data || [];
  },

  // 2. Thêm nguyên liệu mới vào công thức
  addIngredient: async (
    recipeId: string,
    data: {
      name: string;
      quantity?: number | null;
      unit?: string | null;
      notes?: string | null;
      orderIndex?: number | null;
    }
  ): Promise<RecipeIngredientDto> => {
    const res = await apiClient.post<ApiResponse<RecipeIngredientDto>>(`/recipes/${recipeId}/ingredients`, data);
    return res.data?.data;
  },

  // 3. Cập nhật thông tin nguyên liệu
  updateIngredient: async (
    recipeId: string,
    ingredientId: string,
    data: {
      name: string;
      quantity?: number | null;
      unit?: string | null;
      notes?: string | null;
      orderIndex?: number | null;
    }
  ): Promise<RecipeIngredientDto> => {
    const res = await apiClient.put<ApiResponse<RecipeIngredientDto>>(`/recipes/${recipeId}/ingredients/${ingredientId}`, data);
    return res.data?.data;
  },

  // 4. Xóa nguyên liệu khỏi công thức
  deleteIngredient: async (recipeId: string, ingredientId: string): Promise<boolean> => {
    await apiClient.delete(`/recipes/${recipeId}/ingredients/${ingredientId}`);
    return true;
  },

  // ==========================================================================
  // FR-RCP-005: XUẤT BẢN / HỦY XUẤT BẢN CÔNG THỨC (LÂM VĂN ĐỨC - 2314299)
  // ==========================================================================

  // 5. Xuất bản công thức (kiểm tra điều kiện D11)
  publish: async (recipeId: string): Promise<RecipeDetailDto> => {
    const res = await apiClient.patch<ApiResponse<RecipeDetailDto>>(`/recipes/${recipeId}/publish`);
    return res.data?.data;
  },

  // 6. Hủy xuất bản công thức về Draft
  unpublish: async (recipeId: string): Promise<RecipeDetailDto> => {
    const res = await apiClient.patch<ApiResponse<RecipeDetailDto>>(`/recipes/${recipeId}/unpublish`);
    return res.data?.data;
  },

  // ==========================================================================
  // FR-RCP-008: QUẢN LÝ GALLERY ẢNH CÔNG THỨC (LÊ NHẬT TIẾN - 2312770)
  // ==========================================================================

  // 7. Thêm ảnh mới vào gallery của công thức
  addImage: async (
    recipeId: string,
    data: {
      originalUrl: string;
      altText?: string;
      isPrimary?: boolean;
      orderIndex?: number;
    }
  ): Promise<RecipeImageDto> => {
    const res = await apiClient.post<ApiResponse<RecipeImageDto>>(`/recipes/${recipeId}/images`, data);
    return res.data?.data;
  },

  // 8. Xóa ảnh khỏi gallery của công thức
  deleteImage: async (recipeId: string, imageId: string): Promise<boolean> => {
    await apiClient.delete(`/recipes/${recipeId}/images/${imageId}`);
    return true;
  },

  // 9. Đặt ảnh làm ảnh bìa chính (Primary Image) của công thức
  setPrimaryImage: async (recipeId: string, imageId: string): Promise<RecipeImageDto> => {
    const res = await apiClient.patch<ApiResponse<RecipeImageDto>>(`/recipes/${recipeId}/images/${imageId}/primary`);
    return res.data?.data;
  },
};
