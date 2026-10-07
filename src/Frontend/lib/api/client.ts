// Axios instance dùng chung cho mọi lời gọi API sang backend .NET.
// Tự gắn JWT vào header Authorization và tự chuyển về /login khi token hết hạn.
import axios from "axios";
import { getSession } from "next-auth/react";

const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  const base = raw.replace(/\/api\/v1\/?$/, "");
  return `${base}/api/v1`;
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  // Chuẩn hóa URL: Nếu config.url bắt đầu bằng /api/v1 thì loại bỏ để tránh trùng lặp với baseURL
  if (config.url && config.url.startsWith("/api/v1")) {
    config.url = config.url.replace(/^\/api\/v1/, "");
  }

  if (typeof window === "undefined") {
    return config;
  }

  const session = await getSession();

  if (session?.user?.accessToken) {
    config.headers.Authorization = `Bearer ${session.user.accessToken}`;
  } else {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
