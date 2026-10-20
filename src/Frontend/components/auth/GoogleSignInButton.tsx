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
import { establishLoginSession, loginDestination } from "@/lib/login-session";

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
            use_fedcm_for_prompt?: boolean;
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
          disableAutoSelect: () => void;
          revoke: (
            hint: string,
            callback?: (response: { successful: boolean; error?: string }) => void
          ) => void;
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

  // 2. Trạng thái nút Google đã render thành công vào DOM hay chưa (tránh render trùng lặp nút fallback)
  const [isButtonRendered, setIsButtonRendered] = useState(false);

  // 3. Trạng thái đang gửi Google ID Token lên Server xác thực
  const [isLoading, setIsLoading] = useState(false);

  // 4. Trạng thái thông báo lỗi khi xác thực Google
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 5. Lấy Client ID từ biến môi trường (hoặc giá trị mẫu trong lúc phát triển)
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
        await establishLoginSession(authData);
        if (authData.user?.email) {
          localStorage.setItem("lastGoogleEmail", authData.user.email);
        }
        router.push(loginDestination());
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
   * Khởi tạo Google Identity Services và render nút Google duy nhất vào DOM
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
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });

      // Vô hiệu hóa chế độ tự động chọn tài khoản cũ
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch {
        // Bỏ qua nếu trình duyệt không hỗ trợ
      }

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
          width: 320,
          locale: "vi",
        });
        setIsButtonRendered(true);
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
   * Thu hồi phiên ghi nhớ Google của tài khoản trước để ép Google hiển thị danh sách chọn tài khoản mới
   */
  const handleSwitchGoogleAccount = () => {
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("lastGoogleEmail") || "2314299@dlu.edu.vn";
      try {
        if (email && window.google?.accounts?.id?.revoke) {
          window.google.accounts.id.revoke(email, (done) => {
            console.log("Consent revoked:", done);
          });
        }
        window.google?.accounts?.id?.disableAutoSelect?.();
        localStorage.removeItem("lastGoogleEmail");
      } catch (err) {
        console.warn(err);
      }
      setIsButtonRendered(false);
      setTimeout(() => {
        initializeGoogleSignIn();
      }, 200);
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
      <div className="relative w-full flex flex-col items-center">
        {/* Nút chuẩn của Google SDK sẽ render vào div này */}
        <div
          ref={buttonRef}
          className={`w-full flex justify-center min-h-[44px] ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
        />

        {/* Placeholder Loading chỉ hiển thị trong lúc Google SDK đang tải */}
        {!isButtonRendered && (
          <div className="w-full max-w-[320px] flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm">
            <svg className="h-4 w-4 animate-spin text-orange-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Đang tải Google Sign-In...</span>
          </div>
        )}
      </div>

      {/* 4. Lối tắt chọn tài khoản Google khác */}
      <div className="flex justify-center pt-0.5">
        <button
          type="button"
          onClick={handleSwitchGoogleAccount}
          className="text-xs text-slate-500 hover:text-orange-600 transition-colors inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-orange-50"
        >
          <span>🔄</span>
          <span className="underline">Đăng nhập tài khoản Google khác</span>
        </button>
      </div>
    </div>
  );
}
