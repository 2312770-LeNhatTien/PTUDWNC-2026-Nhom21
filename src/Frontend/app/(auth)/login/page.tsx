"use client";

// ============================================================================
// CHỨC NĂNG: Giao diện Đăng nhập tài khoản (FR-AUTH-002 UI)
// THÀNH VIÊN: Lâm Văn Đức (MSSV: 2314299)
// TUẦN 5 (LAB 5): Hoàn thiện UI/UX, Client-side Validation & Phản hồi HTTP
// ============================================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import axios from "axios";
import { authApi } from "@/lib/api/auth";

export default function LoginPage() {
  const router = useRouter();

  // 1. Quản lý trạng thái dữ liệu form đăng nhập
  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // 2. Quản lý lỗi validation theo từng field (field-level validation)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // 3. Trạng thái hiển thị mật khẩu (Ẩn / Hiện)
  const [showPassword, setShowPassword] = useState(false);

  // 4. Trạng thái gửi request lên server (loading spinner)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 5. Quản lý thông báo lỗi phản hồi từ API (401, 423 Locked, 429 Rate Limiting, 500)
  const [alertError, setAlertError] = useState<{
    type: "auth" | "locked" | "ratelimit" | "general";
    message: string;
  } | null>(null);

  /**
   * Kiểm tra tính hợp lệ của từng trường nhập liệu (Client-side validation).
   * @param field Tên trường cần kiểm tra ("email" hoặc "password")
   * @param value Giá trị hiện tại của trường
   * @returns boolean true nếu hợp lệ, false nếu có lỗi
   */
  const validateField = (field: "email" | "password", value: string) => {
    const newErrors = { ...errors };

    if (field === "email") {
      if (!value.trim()) {
        newErrors.email = "Vui lòng nhập địa chỉ email.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        newErrors.email = "Định dạng email không hợp lệ (ví dụ: name@example.com).";
      } else {
        delete newErrors.email;
      }
    }

    if (field === "password") {
      if (!value) {
        newErrors.password = "Vui lòng nhập mật khẩu.";
      } else {
        delete newErrors.password;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Xử lý thay đổi dữ liệu trên ô input và validate tức thời (on-the-fly)
   */
  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (typeof value === "string") {
      validateField(field as "email" | "password", value);
    }
  };

  /**
   * Xử lý submit form đăng nhập và xử lý phản hồi từ Backend
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlertError(null);

    // Bước 1: Xác thực toàn bộ các trường trước khi gửi request
    const emailValid = validateField("email", form.email);
    const passwordValid = validateField("password", form.password);

    if (!emailValid || !passwordValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Bước 2: Gọi API POST /api/v1/auth/login thông qua authApi
      const authData = await authApi.login(form.email.trim(), form.password);

      // Bước 3: Lưu trữ token và thông tin người dùng vào LocalStorage
      if (authData.accessToken) {
        localStorage.setItem("accessToken", authData.accessToken);
      }
      if (authData.refreshToken) {
        localStorage.setItem("refreshToken", authData.refreshToken);
      }
      if (authData.user) {
        localStorage.setItem("user", JSON.stringify(authData.user));
      }

      // Bước 4: Phát sự kiện 'auth-changed' để đồng bộ trạng thái Navbar toàn trang
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-changed"));
      }

      // Bước 5: Chuyển hướng người dùng về trang chủ
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      // Bước 6: Xử lý và phân loại mã lỗi HTTP trả về theo chuẩn RFC 7807 Problem Details
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as
          | { detail?: string; message?: string; title?: string }
          | undefined;

        if (status === 423) {
          // HTTP 423 Locked: Tài khoản bị khóa 15 phút do nhập sai 5 lần
          setAlertError({
            type: "locked",
            message:
              data?.detail ||
              "Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau.",
          });
        } else if (status === 429) {
          // HTTP 429 Too Many Requests: Rate Limiting chống Brute-Force (5 req/phút)
          setAlertError({
            type: "ratelimit",
            message:
              data?.detail ||
              "Bạn đã gửi quá nhiều yêu cầu đăng nhập. Hệ thống đang bảo vệ tài khoản, vui lòng đợi 1 phút.",
          });
        } else if (status === 401) {
          // HTTP 401 Unauthorized: Sai thông tin email hoặc password
          setAlertError({
            type: "auth",
            message: data?.detail || "Email hoặc mật khẩu không chính xác.",
          });
        } else {
          // Các lỗi hệ thống khác
          setAlertError({
            type: "general",
            message:
              data?.detail ||
              data?.message ||
              data?.title ||
              "Đăng nhập thất bại. Vui lòng kiểm tra kết nối mạng và thử lại.",
          });
        }
      } else {
        setAlertError({
          type: "general",
          message: "Đã xảy ra lỗi không xác định. Vui lòng thử lại.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50/60 via-orange-50/40 to-stone-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Khung thẻ Card đăng nhập chính */}
        <div className="rounded-3xl border border-orange-100/80 bg-white/95 p-8 sm:p-10 shadow-xl shadow-orange-500/5 backdrop-blur-sm">
          
          {/* Header & Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 group mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <span className="text-2xl">🍲</span>
              </div>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Đăng nhập tài khoản
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Chào mừng bạn quay trở lại với cộng đồng ẩm thực{" "}
              <span className="font-semibold text-orange-600">Culinary Blog</span>
            </p>
          </div>

          {/* Banner thông báo lỗi trực quan */}
          {alertError && (
            <div
              role="alert"
              className={`mb-6 rounded-2xl p-4 text-sm transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
                alertError.type === "locked"
                  ? "border border-red-300 bg-red-50/90 text-red-900"
                  : alertError.type === "ratelimit"
                  ? "border border-amber-300 bg-amber-50/90 text-amber-900"
                  : "border border-red-200 bg-red-50/80 text-red-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 text-lg">
                  {alertError.type === "locked" && "🔒"}
                  {alertError.type === "ratelimit" && "⏳"}
                  {alertError.type === "auth" && "⚠️"}
                  {alertError.type === "general" && "❌"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {alertError.type === "locked" && "Tài khoản bị tạm khóa (423)"}
                    {alertError.type === "ratelimit" && "Giới hạn yêu cầu (429)"}
                    {alertError.type === "auth" && "Xác thực thất bại"}
                    {alertError.type === "general" && "Lỗi hệ thống"}
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm opacity-90 leading-relaxed">
                    {alertError.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form nhập liệu */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            
            {/* Ô nhập Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-700"
              >
                Địa chỉ Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => validateField("email", form.email)}
                  className={`w-full rounded-2xl border bg-slate-50/60 px-4 py-3 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-orange-500 focus:ring-orange-100/70"
                  }`}
                  placeholder="vidu@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠️</span> {errors.email}
                </p>
              )}
            </div>

            {/* Ô nhập Mật khẩu kèm nút Ẩn/Hiện */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm font-semibold text-slate-700"
                >
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => validateField("password", form.password)}
                  className={`w-full rounded-2xl border bg-slate-50/60 px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    errors.password
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-orange-500 focus:ring-orange-100/70"
                  }`}
                  placeholder="Nhập mật khẩu của bạn"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? (
                    // Icon con mắt gạch chéo (Ẩn mật khẩu)
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    // Icon con mắt mở (Hiện mật khẩu)
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠️</span> {errors.password}
                </p>
              )}
            </div>

            {/* Checkbox Ghi nhớ đăng nhập */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="rememberMe"
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) => handleChange("rememberMe", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-500"
              />
              <label htmlFor="rememberMe" className="text-xs sm:text-sm font-medium text-slate-600 cursor-pointer">
                Ghi nhớ trạng thái đăng nhập
              </label>
            </div>

            {/* Nút Submit Đăng nhập */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/35 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Footer chuyển sang trang Đăng ký */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs sm:text-sm text-slate-500">
              Chưa có tài khoản Culinary Blog?{" "}
              <Link
                href="/register"
                className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
              >
                Đăng ký tài khoản mới
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
