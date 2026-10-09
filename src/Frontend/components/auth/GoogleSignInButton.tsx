"use client";

// ============================================================================
// CHỨC NĂNG: Nút Đăng nhập / Đăng ký một chạm bằng Google OAuth 2.0 (FR-AUTH-003 UI)
// THÀNH VIÊN: Lâm Văn Đức (MSSV: 2314299)
// TUẦN 5 (LAB 5): Tích hợp Google Identity Services (GIS) SDK & xử lý Token
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import axios from "axios";
import { authApi } from "@/lib/api/auth";

// Khai báo kiểu dữ liệu cho đối tượng window.google của Google Identity Services SDK
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  /** Chế độ hiển thị: "login" (Đăng nhập) hoặc "register" (Đăng ký) */
  mode?: "login" | "register";
  /** Callback tùy chọn để truyền lỗi lên Component cha nếu cần */
  onError?: (message: string) => void;
}

export default function GoogleSignInButton({
  mode = "login",
  onError,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);

  // 1. Trạng thái SDK Google đã sẵn sàng hay chưa
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);

  // 2. Trạng thái đang gửi Google ID Token lên Server xác thực
  const [isLoading, setIsLoading] = useState(false);

  // 3. Trạng thái thông báo lỗi khi xác thực Google
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4. Lấy Client ID từ biến môi trường (hoặc giá trị mẫu trong lúc phát triển)
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

  /**
   * Hàm xử lý khi người dùng chọn tài khoản Google thành công trên Popup GIS
   * @param response Đối tượng chứa credential (chính là chuỗi JWT Google ID Token)
   */
  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Bước 1: Gửi Google ID Token lên Backend API: POST /api/v1/auth/google
        // Backend sẽ kiểm tra chữ ký RSA với Google Public Key và tự động tạo User nếu chưa có
        const authData = await authApi.googleLogin(response.credential);

        // Bước 2: Lưu trữ phiên đăng nhập vào LocalStorage
        if (authData.accessToken) {
          localStorage.setItem("accessToken", authData.accessToken);
        }
        if (authData.refreshToken) {
          localStorage.setItem("refreshToken", authData.refreshToken);
        }
        if (authData.user) {
          localStorage.setItem("user", JSON.stringify(authData.user));
        }

        // Bước 3: Phát sự kiện 'auth-changed' để đồng bộ Navbar toàn ứng dụng tức thì
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-changed"));
        }

        // Bước 4: Điều hướng người dùng về trang chủ
        router.push("/");
        router.refresh();
      } catch (error: unknown) {
        // Bước 5: Xử lý thông báo lỗi phản hồi từ Backend
        let message = "Đăng nhập bằng Google không thành công. Vui lòng thử lại.";
        if (axios.isAxiosError(error)) {
          const data = error.response?.data as { detail?: string; message?: string } | undefined;
          message = data?.detail || data?.message || message;
        }
        setErrorMessage(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [router, onError]
  );

  /**
   * Khởi tạo Google Identity Services và render nút Google vào DOM
   */
  const initializeGoogleSignIn = useCallback(() => {
    if (typeof window === "undefined" || !window.google?.accounts?.id) {
      return;
    }

    try {
      // Khởi tạo GIS với Client ID và Callback xử lý
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        cancel_on_tap_outside: true,
      });

      // Render nút Google chuẩn nhận diện thương hiệu vào phần tử buttonRef
      if (buttonRef.current) {
        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: mode === "register" ? "signup_with" : "signin_with",
          shape: "pill",
          logo_alignment: "left",
          width: "100%",
          locale: "vi",
        });
      }
    } catch {
      // Bỏ qua lỗi khởi tạo nếu Client ID chưa được cung cấp thật
    }
  }, [googleClientId, handleCredentialResponse, mode]);

  // Lắng nghe sự kiện khi Google SDK đã tải xong
  useEffect(() => {
    if (isGsiLoaded) {
      initializeGoogleSignIn();
    }
  }, [isGsiLoaded, initializeGoogleSignIn]);

  /**
   * Xử lý khi người dùng nhấn vào nút Google giao diện tùy biến (Custom fallback UI)
   */
  const handleCustomButtonClick = () => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch {
        setErrorMessage("Vui lòng cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID để sử dụng Google Sign-In.");
      }
    } else {
      setErrorMessage("Đang tải dịch vụ xác thực Google, vui lòng thử lại sau vài giây.");
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* 1. Tải Google Identity Services SDK chính thức từ Google */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIsGsiLoaded(true)}
      />

      {/* 2. Thông báo lỗi nếu xảy ra sự cố khi đăng nhập Google */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 animate-in fade-in">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* 3. Khung chứa nút Google chính thức do GIS SDK render */}
      <div className="relative w-full">
        {/* Nút chuẩn của Google SDK sẽ render vào div này */}
        <div
          ref={buttonRef}
          className={`w-full flex justify-center ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
        />

        {/* Nút Fallback thiết kế chuẩn UX hiển thị trong khi SDK đang tải */}
        {(!isGsiLoaded || !buttonRef.current?.hasChildNodes()) && (
          <button
            type="button"
            onClick={handleCustomButtonClick}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              // Icon Loading Spinner
              <svg className="h-4 w-4 animate-spin text-orange-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              // Logo Google đa sắc chuẩn chính hãng
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {isLoading
                ? "Đang xác thực Google..."
                : mode === "register"
                ? "Đăng ký nhanh bằng Google"
                : "Đăng nhập bằng Google"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
