// ============================================================================
// NEXT.JS MIDDLEWARE PHÂN QUYỀN TRUY CẬP (RBAC - FR-SEC-001)
// Tuần 6 (Lab 6): Luồng Xuất bản & Phân quyền Next.js
// Tác giả: Lâm Văn Đức (MSSV: 2314299)
// Nhóm 21 - PTUDWNC-2026
// Quy tắc phân quyền:
//   1. /admin/:path*     -> Yêu cầu Role Admin (Chưa login -> /login; Sai role -> /403)
//   2. /dashboard/:path* -> Yêu cầu Role Author hoặc Admin (Chưa login -> /login; Sai role -> /403)
//   3. /profile/:path*   -> Yêu cầu đăng nhập (Chưa login -> /login)
// ============================================================================

import { auth } from "./lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const rawRoles = session?.user?.roles;
  const roles: string[] = Array.isArray(rawRoles)
    ? rawRoles
    : typeof rawRoles === "string"
    ? [rawRoles]
    : [];

  const pathname = nextUrl.pathname;

  // 1. Phân loại các tuyến đường bảo mật cần kiểm soát
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthorRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/recipes/new") ||
    pathname.startsWith("/recipes/edit");
  const isProfileRoute = pathname.startsWith("/profile");

  const isProtectedRoute = isAdminRoute || isAuthorRoute || isProfileRoute;

  // TRƯỜNG HỢP 1: Người dùng CHƯA ĐĂNG NHẬP truy cập route bảo vệ
  // Tự động chuyển hướng về trang /login kèm tham số callbackUrl để quay lại sau
  if (isProtectedRoute && !isLoggedIn) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // TRƯỜNG HỢP 2: Người dùng ĐÃ ĐĂNG NHẬP -> Kiểm tra vai trò (Role Authorization)
  if (isLoggedIn) {
    const isAdmin = roles.some(
      (r) => r.toLowerCase() === "admin" || r.toLowerCase() === "administrator"
    );
    const isAuthor = roles.some((r) => r.toLowerCase() === "author");

    // 2.1. Tuyến đường Quản trị (/admin/*): Bắt buộc vai trò Admin
    if (isAdminRoute && !isAdmin) {
      return NextResponse.rewrite(new URL("/403", req.url), { status: 403 });
    }

    // 2.2. Tuyến đường Tác giả (/dashboard/*, /recipes/new...): Bắt buộc vai trò Author hoặc Admin
    if (isAuthorRoute && !isAuthor && !isAdmin) {
      return NextResponse.rewrite(new URL("/403", req.url), { status: 403 });
    }

    // 2.3. Tuyến đường Hồ sơ (/profile/*): Đã đăng nhập nên luôn hợp lệ
  }

  // Cho phép tiếp tục truy cập bình thường
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
