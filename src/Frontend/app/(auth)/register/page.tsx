"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import axios from "axios";
import { authApi } from "@/lib/api/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    displayName: "",
    userName: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<{
    email?: string;
    displayName?: string;
    userName?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
  }>({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertError, setAlertError] = useState<{
    type: "conflict" | "validation" | "general";
    message: string;
  } | null>(null);

  // Tính toán độ mạnh mật khẩu (0 -> 100)
  const passwordStrength = useMemo(() => {
    const pwd = form.password;
    if (!pwd) return { score: 0, label: "", color: "bg-slate-200" };

    let score = 0;
    if (pwd.length >= 8) score += 30;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;

    if (score < 40) return { score, label: "Yếu", color: "bg-red-500", text: "text-red-500" };
    if (score < 75) return { score, label: "Trung bình", color: "bg-amber-500", text: "text-amber-500" };
    return { score: 100, label: "Mạnh", color: "bg-emerald-500", text: "text-emerald-500" };
  }, [form.password]);

  const validateField = (field: keyof typeof form, value: string | boolean) => {
    const newErrors = { ...errors };

    if (field === "email" && typeof value === "string") {
      if (!value.trim()) {
        newErrors.email = "Vui lòng nhập địa chỉ email.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        newErrors.email = "Định dạng email không hợp lệ (ví dụ: name@example.com).";
      } else {
        delete newErrors.email;
      }
    }

    if (field === "displayName" && typeof value === "string") {
      if (!value.trim()) {
        newErrors.displayName = "Vui lòng nhập tên hiển thị.";
      } else if (value.trim().length < 2) {
        newErrors.displayName = "Tên hiển thị phải có ít nhất 2 ký tự.";
      } else {
        delete newErrors.displayName;
      }
    }

    if (field === "userName" && typeof value === "string") {
      if (value.trim()) {
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(value.trim())) {
          newErrors.userName = "Tên đăng nhập chỉ gồm 3-30 ký tự chữ, số và dấu gạch dưới (_).";
        } else {
          delete newErrors.userName;
        }
      } else {
        delete newErrors.userName;
      }
    }

    if (field === "password" && typeof value === "string") {
      if (!value) {
        newErrors.password = "Vui lòng nhập mật khẩu.";
      } else if (value.length < 8) {
        newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
      } else {
        delete newErrors.password;
      }

      // Kiểm tra lại confirmPassword nếu đã nhập
      if (form.confirmPassword && value !== form.confirmPassword) {
        newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
      } else if (form.confirmPassword && value === form.confirmPassword) {
        delete newErrors.confirmPassword;
      }
    }

    if (field === "confirmPassword" && typeof value === "string") {
      if (!value) {
        newErrors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
      } else if (value !== form.password) {
        newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
      } else {
        delete newErrors.confirmPassword;
      }
    }

    if (field === "agreeTerms" && typeof value === "boolean") {
      if (!value) {
        newErrors.agreeTerms = "Bạn cần đồng ý với Điều khoản dịch vụ để tiếp tục.";
      } else {
        delete newErrors.agreeTerms;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlertError(null);

    // Validate toàn bộ các trường
    const isEmailValid = validateField("email", form.email);
    const isNameValid = validateField("displayName", form.displayName);
    const isUserValid = validateField("userName", form.userName);
    const isPassValid = validateField("password", form.password);
    const isConfirmValid = validateField("confirmPassword", form.confirmPassword);
    const isTermsValid = validateField("agreeTerms", form.agreeTerms);

    if (
      !isEmailValid ||
      !isNameValid ||
      !isUserValid ||
      !isPassValid ||
      !isConfirmValid ||
      !isTermsValid
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authData = await authApi.register({
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        userName: form.userName.trim() || undefined,
        password: form.password,
      });

      // Lưu trữ phiên đăng nhập
      if (authData.accessToken) {
        localStorage.setItem("accessToken", authData.accessToken);
      }
      if (authData.refreshToken) {
        localStorage.setItem("refreshToken", authData.refreshToken);
      }
      if (authData.user) {
        localStorage.setItem("user", JSON.stringify(authData.user));
      }

      // Thông báo cập nhật trạng thái auth
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-changed"));
      }

      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as
          | {
              detail?: string;
              message?: string;
              title?: string;
              errors?: Record<string, string[]>;
            }
          | undefined;

        if (status === 409) {
          setAlertError({
            type: "conflict",
            message:
              data?.detail || "Địa chỉ email hoặc tên đăng nhập này đã được sử dụng.",
          });
        } else if (status === 400) {
          const errorDetails = data?.errors
            ? Object.values(data.errors).flat().join(" ")
            : data?.detail || "Dữ liệu đăng ký không hợp lệ.";
          setAlertError({
            type: "validation",
            message: errorDetails,
          });
        } else {
          setAlertError({
            type: "general",
            message:
              data?.detail ||
              data?.message ||
              data?.title ||
              "Đăng ký thất bại. Vui lòng kiểm tra kết nối mạng và thử lại.",
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
      <div className="w-full max-w-lg">
        {/* Card Register */}
        <div className="rounded-3xl border border-orange-100/80 bg-white/95 p-8 sm:p-10 shadow-xl shadow-orange-500/5 backdrop-blur-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 group mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <span className="text-2xl">🍲</span>
              </div>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Đăng ký tài khoản mới
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Gia nhập cộng đồng ẩm thực{" "}
              <span className="font-semibold text-orange-600">Culinary Blog</span> để cùng sáng tạo món ngon
            </p>
          </div>

          {/* Alert Banner */}
          {alertError && (
            <div
              role="alert"
              className={`mb-6 rounded-2xl p-4 text-sm transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
                alertError.type === "conflict"
                  ? "border border-amber-300 bg-amber-50/90 text-amber-900"
                  : "border border-red-200 bg-red-50/80 text-red-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 text-lg">
                  {alertError.type === "conflict" ? "⚠️" : "❌"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {alertError.type === "conflict" ? "Xung đột tài khoản (409)" : "Lỗi đăng ký"}
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm opacity-90 leading-relaxed">
                    {alertError.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Register */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-700"
              >
                Địa chỉ Email <span className="text-red-500">*</span>
              </label>
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
              {errors.email && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠️</span> {errors.email}
                </p>
              )}
            </div>

            {/* Display Name & Username in 2 columns on sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Display Name */}
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-700"
                >
                  Tên hiển thị <span className="text-red-500">*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  onBlur={() => validateField("displayName", form.displayName)}
                  className={`w-full rounded-2xl border bg-slate-50/60 px-4 py-3 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    errors.displayName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-orange-500 focus:ring-orange-100/70"
                  }`}
                  placeholder="Bếp Trưởng An"
                />
                {errors.displayName && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                    <span>⚠️</span> {errors.displayName}
                  </p>
                )}
              </div>

              {/* Username (Optional) */}
              <div>
                <label
                  htmlFor="userName"
                  className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-700"
                >
                  Tên đăng nhập <span className="text-slate-400 font-normal">(tùy chọn)</span>
                </label>
                <input
                  id="userName"
                  type="text"
                  autoComplete="username"
                  value={form.userName}
                  onChange={(e) => handleChange("userName", e.target.value)}
                  onBlur={() => validateField("userName", form.userName)}
                  className={`w-full rounded-2xl border bg-slate-50/60 px-4 py-3 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    errors.userName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-orange-500 focus:ring-orange-100/70"
                  }`}
                  placeholder="deptruongan"
                />
                {errors.userName && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                    <span>⚠️</span> {errors.userName}
                  </p>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-700"
              >
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => validateField("password", form.password)}
                  className={`w-full rounded-2xl border bg-slate-50/60 px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    errors.password
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-orange-500 focus:ring-orange-100/70"
                  }`}
                  placeholder="Tối thiểu 8 ký tự"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
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

              {/* Password Strength Meter */}
              {form.password && (
                <div className="mt-2 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                    <span className={`font-semibold ${passwordStrength.text}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠️</span> {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-700"
              >
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  onBlur={() => validateField("confirmPassword", form.confirmPassword)}
                  className={`w-full rounded-2xl border bg-slate-50/60 px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    errors.confirmPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : form.confirmPassword && form.confirmPassword === form.password
                      ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100"
                      : "border-slate-200 focus:border-orange-500 focus:ring-orange-100/70"
                  }`}
                  placeholder="Nhập lại mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
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
              {errors.confirmPassword && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠️</span> {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms of Service Checkbox */}
            <div className="pt-1">
              <div className="flex items-start gap-2.5">
                <input
                  id="agreeTerms"
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(e) => handleChange("agreeTerms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-500"
                />
                <label htmlFor="agreeTerms" className="text-xs sm:text-sm text-slate-600 leading-snug cursor-pointer">
                  Tôi đồng ý với{" "}
                  <Link href="/terms" className="font-semibold text-orange-600 hover:underline">
                    Điều khoản dịch vụ
                  </Link>{" "}
                  và{" "}
                  <Link href="/privacy" className="font-semibold text-orange-600 hover:underline">
                    Chính sách bảo mật
                  </Link>{" "}
                  của Culinary Blog.
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠️</span> {errors.agreeTerms}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/35 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
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
                  <span>Đang khởi tạo tài khoản...</span>
                </>
              ) : (
                <span>Tạo tài khoản</span>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs sm:text-sm text-slate-500">
              Đã có tài khoản Culinary Blog?{" "}
              <Link
                href="/login"
                className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
