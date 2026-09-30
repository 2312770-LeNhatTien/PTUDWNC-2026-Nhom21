import apiClient from "./client";

export const authApi = {
  // FR-AUTH-005: POST /api/v1/auth/logout
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post("/auth/logout", { refreshToken });
  },
};
