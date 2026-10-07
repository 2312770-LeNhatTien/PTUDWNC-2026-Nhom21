import apiClient from "./client";
import type { ApiResponse, AuthResponseDto } from "@/types/api";

export interface RegisterRequest {
  email: string;
  displayName: string;
  userName?: string;
  password: string;
}

export const authApi = {
  // FR-AUTH-001: POST /api/v1/auth/register
  register: async (data: RegisterRequest): Promise<AuthResponseDto> => {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>("/auth/register", data);
    return response.data.data;
  },

  // FR-AUTH-002: POST /api/v1/auth/login
  login: async (email: string, password: string): Promise<AuthResponseDto> => {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>("/auth/login", { email, password });
    return response.data.data;
  },

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
