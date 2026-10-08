// ============================================================================
// CHỨC NĂNG: Axios Client dùng chung cho toàn bộ Frontend Next.js (Lab 5 - Task 3)
// THÀNH VIÊN: Lâm Văn Đức (MSSV: 2314299)
// TÍNH NĂNG CHÍNH:
// 1. Tự động gắn Bearer Token vào header Authorization cho mọi request.
// 2. Axios Response Interceptor bắt mã lỗi HTTP 401 Unauthorized.
// 3. Tự động làm mới Token ngầm (Silent Refresh) qua endpoint POST /api/v1/auth/refresh.
// 4. Hàng đợi Request (Request Queue) chống nghẽn khi có nhiều request gửi đồng thời.
// 5. Token Rotation: Tự động cập nhật cặp AccessToken & RefreshToken mới vào LocalStorage.
// ============================================================================

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";
import type { ApiResponse, AuthResponseDto } from "@/types/api";

// Mở rộng kiểu dữ liệu của AxiosRequestConfig để hỗ trợ cờ _retry (chống lặp vô hạn)
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Lấy Base URL của Backend API từ biến môi trường
 */
const getApiBaseUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  const base = raw.replace(/\/api\/v1\/?$/, "");
  return `${base}/api/v1`;
};

// Khởi tạo instance Axios chính dùng chung cho toàn ứng dụng
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ----------------------------------------------------------------------------
// QUẢN LÝ HÀNG ĐỢI REQUEST (REQUEST QUEUE) CHO TIẾN TRÌNH SILENT REFRESH
// ----------------------------------------------------------------------------

// Cờ đánh dấu xem hiện tại có tiến trình refresh token nào đang chạy ngầm hay không
let isRefreshing = false;

// Mảng hàng đợi chứa các request bị 401 cần chờ Access Token mới
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

/**
 * Hàm giải phóng hàng đợi request:
 * - Nếu refresh thành công: Gọi resolve cho toàn bộ request đang chờ với newAccessToken.
 * - Nếu refresh thất bại: Gọi reject cho toàn bộ request đang chờ với lỗi tương ứng.
 */
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

// ----------------------------------------------------------------------------
// REQUEST INTERCEPTOR: Tự động đính kèm Access Token vào Header
// ----------------------------------------------------------------------------
apiClient.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") {
    return config;
  }

  // 1. Kiểm tra NextAuth Session trước (nếu có sử dụng NextAuth)
  const session = await getSession();
  if (session?.user?.accessToken) {
    config.headers.Authorization = `Bearer ${session.user.accessToken}`;
    return config;
  }

  // 2. Lấy Access Token lưu trong LocalStorage
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ----------------------------------------------------------------------------
// RESPONSE INTERCEPTOR: Bắt lỗi 401 & Tự động Refresh Token ngầm (Silent Refresh)
// ----------------------------------------------------------------------------
apiClient.interceptors.response.use(
  // Trả về dữ liệu nguyên vẹn nếu request thành công (2xx)
  (response) => response,

  // Xử lý lỗi khi request thất bại (4xx, 5xx)
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // 1. Nếu không có config hoặc không phải lỗi HTTP 401 Unauthorized -> reject ngay
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";

    // 2. Bỏ qua các endpoint xác thực công khai để tránh tạo vòng lặp vô tận:
    // - /auth/login: Sai mật khẩu (báo lỗi trên form thay vì refresh)
    // - /auth/register: Lỗi đăng ký
    // - /auth/google: Lỗi đăng nhập Google
    // - /auth/refresh: Chính tiến trình refresh bị 401 (Refresh Token hết hạn/bị thu hồi)
    const isAuthRoute =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/google") ||
      requestUrl.includes("/auth/refresh");

    if (isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    // 3. Nếu đang có một tiến trình refresh token khác chạy ngầm -> xếp hàng chờ
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newAccessToken) => {
          // Gán Access Token mới vào header và thực thi lại request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        })
        .catch((queueError) => Promise.reject(queueError));
    }

    // 4. Đánh dấu request này đã được thử refresh một lần (chống retry lặp vô hạn)
    originalRequest._retry = true;
    isRefreshing = true;

    // Lấy Refresh Token hiện tại từ LocalStorage
    const currentRefreshToken =
      typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;

    // Nếu không có Refresh Token (chưa đăng nhập hoặc đã bị xóa) -> dọn sạch và chuyển về /login
    if (!currentRefreshToken) {
      isRefreshing = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-changed"));
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    try {
      // 5. Gửi request làm mới token ngầm bằng instance Axios riêng biệt (tránh đệ quy interceptor)
      const refreshResponse = await axios.post<ApiResponse<AuthResponseDto>>(
        `${getApiBaseUrl()}/auth/refresh`,
        { refreshToken: currentRefreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const authData = refreshResponse.data?.data;
      if (!authData?.accessToken) {
        throw new Error("Không nhận được Access Token mới từ máy chủ.");
      }

      const newAccessToken = authData.accessToken;
      const newRefreshToken = authData.refreshToken;
      const user = authData.user;

      // 6. Cập nhật cặp Token mới vào LocalStorage (Tuân thủ Refresh Token Rotation)
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }
        window.dispatchEvent(new Event("auth-changed"));
      }

      // 7. Gán Access Token mới vào header của request ban đầu
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // 8. Giải phóng toàn bộ các request đang chờ trong hàng đợi
      processQueue(null, newAccessToken);

      // 9. Thực thi lại (Replay) request ban đầu và trả về kết quả
      return apiClient(originalRequest);
    } catch (refreshError: unknown) {
      // 10. Khi refresh thất bại (Refresh Token hết hạn hẳn hoặc bị phát hiện Reuse Detection)
      processQueue(refreshError, null);

      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-changed"));
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      // Đặt lại cờ trạng thái refresh để sẵn sàng cho các lần sau
      isRefreshing = false;
    }
  }
);

export default apiClient;
