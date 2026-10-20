'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';

/**
 * ============================================================================
 * TRANG BÁO LỖI PHÂN QUYỀN TRUY CẬP (403 FORBIDDEN - FR-SEC-001)
 * ============================================================================
 * Hiển thị khi người dùng đã đăng nhập nhưng không có vai trò phù hợp
 * để truy cập vào phân vùng bảo vệ (Admin hoặc Author).
 * 
 * Tác giả: Lâm Văn Đức (MSSV: 2314299)
 * Nhóm 21 - PTUDWNC-2026
 */
export default function ForbiddenPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    displayName?: string;
    email?: string;
    roles?: string[];
  } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  /**
   * Đăng xuất tài khoản hiện tại để người dùng có thể đăng nhập bằng tài khoản khác
   */
  const handleSwitchAccount = async () => {
    setIsLoggingOut(true);
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.warn('Lỗi khi thu hồi token:', err);
    } finally {
      // Xóa Google Auto-select nếu có
      if (typeof window !== 'undefined') {
        try {
          const emailToRevoke = currentUser?.email || localStorage.getItem('lastGoogleEmail');
          const googleId = (
            window as unknown as {
              google?: {
                accounts?: {
                  id?: {
                    disableAutoSelect?: () => void;
                    revoke?: (hint: string, cb?: (res: unknown) => void) => void;
                  };
                };
              };
            }
          ).google?.accounts?.id;
          if (googleId) {
            googleId.disableAutoSelect?.();
            if (emailToRevoke && googleId.revoke) {
              googleId.revoke(emailToRevoke);
            }
          }
        } catch {
          // Bỏ qua nếu Google SDK chưa nạp
        }
      }

      useAuthStore.getState().clearSession();
      window.dispatchEvent(new Event('auth-changed'));
      try {
        await signOut({ redirect: false });
      } catch (e) {
        console.warn('Không thể kết thúc session cookie:', e);
      }
      router.push('/login');
    }
  };

  const userRoles = currentUser?.roles || [];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-gradient-to-b from-stone-50 via-white to-orange-50/30">
      <div className="w-full max-w-lg text-center space-y-6">
        {/* Biểu tượng khiên bảo mật 403 */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-500 via-orange-500 to-amber-500 p-0.5 shadow-xl shadow-orange-500/10">
          <div className="w-full h-full bg-white rounded-3xl flex items-center justify-center">
            <svg
              className="w-12 h-12 text-rose-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-md">
            403
          </span>
        </div>

        {/* Tiêu đề & Thông điệp */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
            Quyền Truy Cập Bị Từ Chối
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Khu Vực Giới Hạn Quyền Hạn
          </h1>
          <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
            Bạn không có đủ vai trò cần thiết để xem nội dung trang này. Vui lòng kiểm tra lại quyền hạn hoặc đăng nhập bằng tài khoản có thẩm quyền (Quản trị viên hoặc Tác giả).
          </p>
        </div>

        {/* Thẻ hiển thị thông tin tài khoản hiện tại */}
        {currentUser && (
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-left max-w-md mx-auto space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="text-neutral-500 font-medium">Tài khoản hiện tại:</span>
              <span className="font-bold text-neutral-900">
                {currentUser.displayName || currentUser.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Vai trò đang sở hữu:</span>
              <div className="flex flex-wrap gap-1">
                {userRoles.length > 0 ? (
                  userRoles.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-0.5 rounded-md font-semibold bg-neutral-200 text-neutral-800"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-0.5 rounded-md font-semibold bg-neutral-200 text-neutral-600">
                    Người dùng thông thường (User)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Các nút hành động điều hướng */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-700 transition flex items-center justify-center gap-2"
          >
            <span>Về Trang Chủ</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleSwitchAccount}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs sm:text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoggingOut ? (
              <>
                <span className="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Đổi Tài Khoản Khác</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-neutral-500 hover:text-neutral-800 text-xs sm:text-sm font-medium transition"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
