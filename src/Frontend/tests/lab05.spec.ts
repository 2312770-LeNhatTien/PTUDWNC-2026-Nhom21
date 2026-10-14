import { test, expect } from '@playwright/test';

const category = { id: '11111111-1111-1111-1111-111111111111', name: 'Món nước', slug: 'mon-nuoc', description: '', imageUrl: '', orderIndex: 0, recipeCount: 0 };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
  await page.route('**/api/v1/categories', route => route.fulfill({ json: { data: [category] } }));
  await page.route('**/api/v1/recipes**', route => route.fulfill({ json: { data: [], meta: { total: 25, page: 1, pageSize: 12, totalPages: 3 } } }));
});

test('debounces search, calls full-text endpoint, preserves filters during pagination', async ({ page }) => {
  await page.goto('/recipes');
  await expect(page.getByRole('status').filter({ hasText: 'Tìm thấy' })).toBeVisible();
  const searchRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/recipes/search?')) searchRequests.push(request.url()); });
  await page.getByRole('searchbox', { name: 'Tìm công thức' }).fill('pho bo');
  await page.waitForTimeout(150);
  expect(searchRequests).toHaveLength(0);
  await expect.poll(() => searchRequests.length).toBe(1);
  expect(new URL(searchRequests[0]).searchParams.get('q')).toBe('pho bo');
  await page.getByRole('button', { name: /Bộ lọc/ }).click();
  await page.getByLabel('Danh mục', { exact: true }).selectOption(category.id);
  await page.getByLabel('Độ khó', { exact: true }).selectOption('Easy');
  await page.getByLabel('Thời gian nấu tối đa').selectOption('30');
  await page.getByLabel('Sắp xếp theo').selectOption('cookTime');
  await page.getByLabel('Thứ tự', { exact: true }).selectOption('asc');
  await expect(page).toHaveURL(/sortOrder=asc/);
  await expect(page.getByRole('button', { name: 'Sau', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  const url = new URL(page.url());
  for (const [key, value] of Object.entries({ q: 'pho bo', categoryId: category.id, difficulty: 'Easy', maxCookTime: '30', sortBy: 'cookTime', sortOrder: 'asc', page: '2' })) expect(url.searchParams.get(key)).toBe(value);
  await page.getByRole('button', { name: 'Xóa tìm kiếm và bộ lọc' }).click();
  await expect(page).toHaveURL(/\/recipes$/);
});

test('edits in a modal without submitting a new slug', async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route(`**/api/v1/categories/${category.id}`, async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { data: { ...category, ...payload } } });
  });
  await page.goto('/admin/categories');
  await page.getByRole('button', { name: 'Sửa Món nước' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toContainText('Slug giữ nguyên: mon-nuoc');
  await modal.getByLabel('Tên danh mục', { exact: true }).fill('Món canh');
  await modal.getByRole('button', { name: 'Lưu danh mục' }).click();
  await expect(modal).not.toBeVisible();
  expect(payload?.name).toBe('Món canh');
  expect(payload).not.toHaveProperty('slug');
  await expect(page.getByRole('status').filter({ hasText: 'giữ nguyên slug' })).toBeVisible();
});

test('creates a category using the add modal', async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route('**/api/v1/categories', async route => {
    if (route.request().method() === 'POST') {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { data: { ...category, ...payload } } });
    } else await route.fulfill({ json: { data: [category] } });
  });
  await page.goto('/admin/categories');
  await page.getByRole('button', { name: '+ Thêm danh mục' }).click();
  await page.getByRole('dialog').getByLabel('Tên danh mục', { exact: true }).fill('Món mới');
  await page.getByRole('button', { name: 'Lưu danh mục' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã tạo danh mục' })).toBeVisible();
  expect(payload?.name).toBe('Món mới');
});

test('keeps delete confirmation open on CATEGORY_NOT_EMPTY and supports successful delete', async ({ page }) => {
  let blocked = true;
  await page.route(`**/api/v1/categories/${category.id}`, route => blocked
    ? route.fulfill({ status: 409, json: { detail: 'CATEGORY_NOT_EMPTY' } })
    : route.fulfill({ status: 204 }));
  await page.goto('/admin/categories');
  await page.getByRole('button', { name: 'Xóa Món nước' }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Danh mục còn công thức');
  blocked = false;
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Đã xóa mềm' })).toBeVisible();
});

test('shows a retryable API error instead of a false empty result', async ({ page }) => {
  await page.route('**/api/v1/recipes**', route => route.fulfill({ status: 500, json: { detail: 'Unavailable' } }));
  await page.goto('/recipes?q=pho');
  await expect(page.getByRole('alert').filter({ hasText: 'Không thể tải công thức' })).toBeVisible();
  await page.route('**/api/v1/recipes**', route => route.fulfill({ json: { data: [], meta: { total: 0 } } }));
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Không có công thức phù hợp.', { exact: false })).toBeVisible();
});
