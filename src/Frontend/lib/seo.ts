/**
 * Tiện ích hỗ trợ SEO, Canonical URL và Schema.org JSON-LD
 * (Nhiệm vụ P03 - MSSV 2312792 - Nguyễn Đình Tuấn)
 */

/**
 * Lấy Base URL chính thức của trang web cho SEO và Canonical.
 * Ưu tiên các biến môi trường cấu hình production/docker:
 * NEXT_PUBLIC_SITE_URL -> PUBLIC_ORIGIN -> NEXT_PUBLIC_APP_URL -> AUTH_URL -> fallback http://localhost:3000
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/**
 * Serialize dữ liệu JSON-LD an toàn, chống XSS (P1 Remediation).
 * Thay thế các ký tự HTML nhạy cảm (<, >, &, \u2028, \u2029) thành mã Unicode escape tương ứng,
 * ngăn chặn việc kẻ tấn công đóng thẻ </script> để thực thi mã JavaScript tùy ý trong trình duyệt.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
