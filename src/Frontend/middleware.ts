// Chặn truy cập các trang cần đăng nhập, tự chuyển về /login nếu chưa có session.
import { auth } from "./lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;

  // Các đường dẫn yêu cầu đăng nhập. Bổ sung thêm khi làm trang mới.
  const isProtected =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/recipes/new") ||
    nextUrl.pathname.startsWith("/recipes/edit");

  if (isProtected && !isLoggedIn) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtected && isLoggedIn) {
    const roles = session.user.roles;
    const allowed = nextUrl.pathname.startsWith('/dashboard') ? roles.some(role => role === 'Author' || role === 'Admin') : true;
    if (!allowed) return new NextResponse('Bạn không có quyền truy cập trang này.', { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
