import apiClient from "./client";
import type { ApiResponse, AuthResponseDto, UserDto } from "@/types/api";

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

  // FR-AUTH-006: GET /api/v1/auth/me - Xem thông tin hồ sơ cá nhân bảo mật
  getProfile: async (): Promise<UserDto> => {
    const response = await apiClient.get<ApiResponse<UserDto>>("/auth/me");
    return response.data.data;
  },

  // FR-AUTH-007: PATCH /api/v1/auth/me - Cập nhật hồ sơ cá nhân
  updateProfile: async (data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<UserDto> => {
    const response = await apiClient.patch<ApiResponse<UserDto>>("/auth/me", data);
    return response.data.data;
  },
};
