// ============================================================================
// KIỂM THỬ TỰ ĐỘNG: NEXT.JS MIDDLEWARE & PHÂN QUYỀN RBAC (FR-SEC-001)
// Tuần 6 (Lab 6): Luồng Xuất bản & Phân quyền Next.js
// Tác giả: Lâm Văn Đức (MSSV: 2314299)
// Nhóm 21 - PTUDWNC-2026
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('Next.js Middleware & Phân Quyền Truy Cập (RBAC)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock các endpoint cơ bản để trang hoạt động ổn định trong môi trường test cô lập
    await page.route('**/api/auth/session', (route) => route.fulfill({ json: {} }));
    await page.route('**/api/v1/categories', (route) => route.fulfill({ json: { data: [] } }));
    await page.route('**/api/v1/recipes**', (route) =>
      route.fulfill({ json: { data: [], meta: { total: 0 } } })
    );
  });

  test('TC1: Khách vãng lai truy cập /admin/categories phải bị chuyển hướng về /login kèm callbackUrl', async ({
    page,
  }) => {
    await page.goto('/admin/categories');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin%2Fcategories/);
  });

  test('TC2: Khách vãng lai truy cập /dashboard/recipes phải bị chuyển hướng về /login kèm callbackUrl', async ({
    page,
  }) => {
    await page.goto('/dashboard/recipes');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Frecipes/);
  });

  test('TC3: Khách vãng lai truy cập /dashboard/recipes/new phải bị chuyển hướng về /login kèm callbackUrl', async ({
    page,
  }) => {
    await page.goto('/dashboard/recipes/new');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Frecipes%2Fnew/);
  });

  test('TC4: Khách vãng lai truy cập /profile phải bị chuyển hướng về /login kèm callbackUrl', async ({
    page,
  }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fprofile/);
  });

  test('TC5: Trang lỗi 403 Forbidden hiển thị đầy đủ thông tin bảo mật và các nút điều hướng', async ({
    page,
  }) => {
    await page.goto('/403');
    // Kiểm tra các thành phần chính của trang 403
    await expect(
      page.getByRole('heading', { name: /Khu Vực Giới Hạn Quyền Hạn/i })
    ).toBeVisible();
    await expect(page.getByText('403', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Quyền Truy Cập Bị Từ Chối', { exact: false })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Về Trang Chủ/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Đổi Tài Khoản Khác/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Quay lại/i })
    ).toBeVisible();
  });
});
