import apiClient from "./client";
import type { ApiResponse, AuthResponseDto } from "@/types/api";

export const authApi = {
  // FR-AUTH-003: POST /api/v1/auth/google
  googleLogin: async (idToken: string): Promise<AuthResponseDto> => {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>("/auth/google", { idToken });
    return response.data.data;
  },

  // FR-AUTH-004: POST /api/v1/auth/refresh
  refreshToken: async (refreshToken: string): Promise<AuthResponseDto> => {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>("/auth/refresh", { refreshToken });
    return response.data.data;
  },

  // FR-AUTH-005: POST /api/v1/auth/logout
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post("/auth/logout", { refreshToken });
  },
};
