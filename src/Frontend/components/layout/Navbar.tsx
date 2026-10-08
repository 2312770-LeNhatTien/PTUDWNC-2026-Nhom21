"use client";

// ============================================================================
// CHỨC NĂNG: Thanh điều hướng Navbar chính của toàn trang web (Lab 5 - Task 4)
// THÀNH VIÊN: Lâm Văn Đức (MSSV: 2314299)
// TÍNH NĂNG NỔI BẬT:
// 1. Quản lý trạng thái phiên đăng nhập (Đồng bộ qua sự kiện 'auth-changed').
// 2. Dropdown Menu Người dùng hiển thị Tên, Email, Avatar và Huy hiệu Phân quyền (Admin / Author).
// 3. Tự động đóng Menu khi người dùng click ra bên ngoài (Click Outside Handler).
// 4. Các lối tắt nghiệp vụ theo Role: Hồ sơ cá nhân, Viết công thức, Quản trị hệ thống.
// 5. Nút Đăng xuất an toàn (FR-AUTH-005): Thu hồi token trên CSDL và dọn sạch LocalStorage.
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";

/**
 * Interface biểu diễn thông tin người dùng lưu trữ trong LocalStorage
 */
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  roles?: string[];
}

export default function Navbar() {
  const router = useRouter();

  // 1. Quản lý trạng thái đóng/mở Mobile Menu và User Dropdown Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // 2. Quản lý thông tin người dùng hiện tại đang đăng nhập
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // 3. Quản lý ô tìm kiếm nhanh công thức
  const [searchQuery, setSearchQuery] = useState("");

  // 4. Ref tham chiếu tới khung Dropdown để xử lý đóng khi click ra ngoài
  const userMenuRef = useRef<HTMLDivElement>(null);

  /**
   * Đồng bộ thông tin người dùng từ LocalStorage vào React State
   */
  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    };

    // Đồng bộ ngay khi component mount
    syncUser();

    // Lắng nghe sự kiện đăng nhập/đăng xuất/refresh token để cập nhật Navbar tức thời
    window.addEventListener("auth-changed", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("auth-changed", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  /**
   * Tự động đóng Dropdown menu khi người dùng click ra bất kỳ vị trí nào bên ngoài
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  /**
   * Xử lý Đăng xuất an toàn (FR-AUTH-005)
   * 1. Gửi request POST /api/v1/auth/logout lên Backend để thu hồi Refresh Token trong CSDL.
   * 2. Xóa sạch accessToken, refreshToken, user khỏi LocalStorage.
   * 3. Phát sự kiện 'auth-changed' để toàn bộ ứng dụng trở về trạng thái Khách.
   * 4. Điều hướng người dùng về trang Đăng nhập (/login).
   */
  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.warn("Không thể thu hồi token từ server:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setCurrentUser(null);
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/login");
    }
  };

  /**
   * Xử lý gửi form tìm kiếm công thức
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/recipes?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  // Kiểm tra vai trò phân quyền của người dùng hiện tại
  const isAdmin = currentUser?.roles?.includes("Admin") ?? false;
  const isAuthor = currentUser?.roles?.includes("Author") ?? false;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-orange-100 bg-white/95 backdrop-blur-md transition-all shadow-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* 1. Logo thương hiệu Culinary Blog */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <span className="text-2xl">🍲</span>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-neutral-900">
              Culinary<span className="text-orange-600">Blog</span>
            </span>
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
              Cộng Đồng Ẩm Thực Việt
            </span>
          </div>
        </Link>

        {/* 2. Menu Điều hướng chính - Màn hình Desktop */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
          <Link href="/" className="hover:text-orange-600 transition-colors">
            Trang chủ
          </Link>
          <Link href="/recipes" className="hover:text-orange-600 transition-colors">
            Khám phá công thức
          </Link>
          <Link href="/categories" className="hover:text-orange-600 transition-colors">
            Danh mục
          </Link>
          <Link
            href="/upload-test"
            className="hover:text-orange-600 transition-colors flex items-center gap-1"
          >
            <span>📸</span> Tải ảnh lên
          </Link>
          <Link
            href="/recipes/steps-test"
            className="hover:text-orange-600 transition-colors flex items-center gap-1"
          >
            <span>📋</span> Các bước nấu
          </Link>
        </nav>

        {/* 3. Ô tìm kiếm nhanh - Màn hình Desktop */}
        <form onSubmit={handleSearch} className="hidden lg:flex items-center relative w-60">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm món ăn, nguyên liệu..."
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-4 pr-10 text-sm outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
          />
          <button
            type="submit"
            aria-label="Tìm kiếm"
            className="absolute right-3 text-neutral-400 hover:text-orange-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </form>

        {/* 4. Khối Tài khoản & Nút thao tác - Màn hình Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          
          {/* Nút Viết công thức mới (dành cho Author & Admin) */}
          <Link
            href="/dashboard/recipes/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors border border-orange-200/60 shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Viết công thức
          </Link>

          {/* TRƯỜNG HỢP 1: Người dùng ĐÃ ĐĂNG NHẬP (Hiển thị Dropdown Menu) */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-expanded={isUserMenuOpen}
                className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/70 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-slate-800 hover:bg-orange-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {/* Ảnh đại diện Avatar (hoặc Chữ cái đầu tên) */}
                {currentUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="h-7 w-7 rounded-full object-cover shadow-sm border border-orange-200"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 font-bold text-white uppercase text-xs shadow-sm">
                    {currentUser.displayName ? currentUser.displayName.charAt(0) : "U"}
                  </span>
                )}

                <span className="max-w-[110px] truncate">{currentUser.displayName}</span>
                <svg
                  className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Hộp Dropdown Menu Tài khoản */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-3xl border border-orange-100 bg-white/95 p-2 shadow-2xl shadow-orange-500/10 backdrop-blur-md ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  
                  {/* Phần thông tin hồ sơ & Huy hiệu Vai trò */}
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-3 mb-1 border border-orange-100/60">
                    <div className="flex items-center gap-2.5">
                      {currentUser.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.displayName}
                          className="h-9 w-9 rounded-full object-cover border border-orange-200 shadow-sm"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 font-bold text-white uppercase text-sm shadow-sm">
                          {currentUser.displayName ? currentUser.displayName.charAt(0) : "U"}
                        </span>
                      )}

                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.displayName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      </div>
                    </div>

                    {/* Huy hiệu Phân quyền (Role Badge) */}
                    <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-orange-200/50">
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 shadow-sm">
                          <span>👑</span> Quản trị viên
                        </span>
                      )}
                      {isAuthor && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800 shadow-sm">
                          <span>👨‍🍳</span> Tác giả
                        </span>
                      )}
                      {!isAdmin && !isAuthor && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-700">
                          <span>👤</span> Thành viên
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Danh sách liên kết chức năng */}
                  <div className="space-y-0.5 text-xs font-medium text-slate-700">
                    
                    {/* Hồ sơ cá nhân (FR-AUTH-006) */}
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <span className="text-sm">👤</span>
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    {/* Viết công thức mới */}
                    <Link
                      href="/dashboard/recipes/new"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <span className="text-sm">✍️</span>
                      <span>Viết công thức mới</span>
                    </Link>

                    {/* Quản lý công thức */}
                    <Link
                      href="/dashboard/recipes"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <span className="text-sm">📖</span>
                      <span>Công thức của tôi</span>
                    </Link>

                    {/* Lối tắt dành riêng cho Quản trị viên (Admin Panel) */}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-purple-700 hover:bg-purple-50 hover:text-purple-800 transition-colors font-semibold"
                      >
                        <span className="text-sm">⚙️</span>
                        <span>Trang Quản trị Hệ thống</span>
                      </Link>
                    )}
                  </div>

                  {/* Nút Đăng xuất an toàn (FR-AUTH-005) */}
                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                    >
                      <span className="text-sm">🚪</span>
                      <span>Đăng xuất an toàn</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TRƯỜNG HỢP 2: Khách vãng lai (Chưa đăng nhập) */
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-orange-600 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition-all active:scale-[0.98]"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>

        {/* 5. Nút Bật/Tắt Menu trên Mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          type="button"
          aria-label="Menu"
          className="flex md:hidden p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* 6. Giao diện Dropdown Menu trên Điện thoại (Mobile) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white px-4 pt-3 pb-6 space-y-4 shadow-xl animate-in slide-in-from-top duration-200">
          
          {/* Ô tìm kiếm Mobile */}
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm món ăn, nguyên liệu..."
              className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-4 pr-10 text-sm outline-none focus:border-orange-500 focus:bg-white"
            />
            <button type="submit" className="absolute right-3 top-3 text-neutral-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Liên kết trang chính Mobile */}
          <nav className="flex flex-col space-y-1 font-medium text-neutral-700 text-sm">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              🏠 Trang chủ
            </Link>
            <Link
              href="/recipes"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              🍲 Khám phá công thức
            </Link>
            <Link
              href="/categories"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              📁 Danh mục món ăn
            </Link>
            <Link
              href="/upload-test"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              📸 Tải ảnh lên (MinIO)
            </Link>
            <Link
              href="/recipes/steps-test"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              📋 Các bước nấu
            </Link>
          </nav>

          {/* Phần trạng thái người dùng trên Mobile */}
          <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
            
            <Link
              href="/dashboard/recipes/new"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 text-sm font-semibold text-orange-700 border border-orange-200/60"
            >
              <span>✍️</span> Viết công thức mới
            </Link>

            {currentUser ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-orange-50/50">
                  {currentUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName}
                      className="h-9 w-9 rounded-full object-cover border border-orange-200"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 font-bold text-white uppercase text-xs">
                      {currentUser.displayName ? currentUser.displayName.charAt(0) : "U"}
                    </span>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{currentUser.displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {isAdmin && (
                        <span className="rounded bg-red-100 px-1.5 py-0.2 text-[9px] font-bold text-red-700">
                          Admin
                        </span>
                      )}
                      {isAuthor && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.2 text-[9px] font-bold text-orange-800">
                          Tác giả
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  👤 Hồ sơ cá nhân
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
                >
                  🚪 Đăng xuất an toàn
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
