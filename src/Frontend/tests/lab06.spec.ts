import { test, expect } from '@playwright/test';

const user = { id: 'lab06-author', email: 'author@example.test', displayName: 'Tác giả Lab 6', roles: ['Author'] };
test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/providers', route => route.fulfill({ json: {
    'backend-token': { id: 'backend-token', name: 'Credentials', type: 'credentials', signinUrl: 'http://localhost:3105/api/auth/signin/backend-token', callbackUrl: 'http://localhost:3105/api/auth/callback/backend-token' }
  } }));
  await page.route('**/api/auth/csrf', route => route.fulfill({ json: { csrfToken: 'local-test-csrf' } }));
  await page.route('**/api/auth/callback/backend-token**', route => route.fulfill({ json: { url: 'http://localhost:3105/' } }));
  await page.route('**/api/auth/signout', route => route.fulfill({ json: { url: 'http://localhost:3105/login' } }));
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
  await page.route('**/api/v1/categories', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/v1/recipes**', route => route.fulfill({ json: { data: [], meta: { total: 25, page: 1, pageSize: 12, totalPages: 3 } } }));
});

test('auth store updates Navbar after login, survives reload, clears on logout', async ({ page }) => {
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: { data: { accessToken: 'local-test-access', refreshToken: 'local-test-refresh', user } } }));
  await page.route('**/api/v1/auth/logout', route => route.fulfill({ status: 204 }));
  await page.goto('/login');
  await page.locator('#email').fill(user.email);
  await page.locator('input[type=password]').fill('Example@123');
  await page.locator('form').filter({ has: page.locator('#email') }).locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('header')).toContainText(user.displayName);
  await page.reload();
  await expect(page.locator('header')).toContainText(user.displayName);
  await page.locator('header').getByRole('button').filter({ hasText: user.displayName }).click();
  await page.getByRole('button', { name: /Đăng xuất/ }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();
  await expect(page.locator('header')).not.toContainText(user.displayName);
});

test('shared loading, safe API error and retry work together', async ({ page }) => {
  let complete: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { complete = resolve; });
  await page.route('**/api/v1/recipes**', async route => {
    await gate;
    await route.fulfill({ status: 500, json: { detail: 'Internal database connection secret' } });
  });
  await page.goto('/recipes');
  await expect(page.getByRole('status').filter({ hasText: 'Đang tìm công thức' })).toBeVisible();
  complete!();
  await expect(page.getByRole('alert').filter({ hasText: 'Không thể tải công thức' })).toContainText('Không thể tải công thức');
  await expect(page.getByRole('alert').filter({ hasText: 'Không thể tải công thức' })).not.toContainText('Internal database');
  await page.route('**/api/v1/recipes**', route => route.fulfill({ json: { data: [], meta: { total: 0 } } }));
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Không có công thức phù hợp.', { exact: false })).toBeVisible();
});

test('common layout and pagination fit mobile and desktop', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/recipes');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toHaveCount(1);
    const pagination = page.getByRole('navigation', { name: 'Phân trang' });
    await expect(pagination.getByRole('button', { name: 'Trước', exact: true })).toBeDisabled();
    await pagination.getByRole('button', { name: 'Sau', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pagination).toContainText('Trang 2 / 3');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/lab06-layout-${width}.png`, fullPage: true });
  }
});

test('malformed stored user does not crash common layout', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('user', '{invalid'); });
  await page.goto('/recipes');
  await expect(page.getByRole('heading', { name: 'Khám phá công thức nấu ăn' })).toBeVisible();
  await expect(page.locator('header')).toContainText('Đăng nhập');
});


test('concurrent 401 requests rotate tokens once and replay with fresh token', async ({ page }) => {
  await page.addInitScript(user => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', 'expired-access');
    localStorage.setItem('refreshToken', 'old-refresh');
  }, user);
  let refreshes = 0;
  await page.route('**/api/v1/auth/refresh', async route => {
    refreshes++;
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill({ json: { data: { accessToken: 'fresh-access', refreshToken: 'new-refresh', user: { ...user, displayName: 'Đã làm mới' } } } });
  });
  for (const path of ['categories', 'recipes**']) {
    await page.route(`**/api/v1/${path}`, route => route.request().headers()['authorization'] === 'Bearer fresh-access'
      ? route.fulfill({ json: { data: [], meta: { total: 0 } } })
      : route.fulfill({ status: 401, json: { detail: 'Expired' } }));
  }
  await page.goto('/recipes');
  await expect(page.getByText('Không có công thức phù hợp.', { exact: false })).toBeVisible();
  await expect(page.locator('header')).toContainText('Đã làm mới');
  expect(refreshes).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('refreshToken'))).toBe('new-refresh');
});


test('Navbar keeps admin-only tools hidden from guests and authors on desktop and mobile', async ({ page }) => {
  for (const roles of [null, ['Author'], ['Admin']]) {
    await page.goto('/recipes');
    await page.evaluate(({ user, roles }) => {
      if (roles) localStorage.setItem('user', JSON.stringify({ ...user, roles }));
      else localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-changed'));
    }, { user, roles });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 390) await page.getByRole('button', { name: 'Menu', exact: true }).click();
      const header = page.locator('header');
      const steps = header.getByRole('link', { name: /Các bước nấu/ });
      const ingredients = header.getByRole('link', { name: /Nguyên liệu/ });
      if (roles?.includes('Admin')) {
        await expect(steps).toBeVisible();
        await expect(ingredients).toBeVisible();
      } else {
        await expect(steps).toHaveCount(0);
        await expect(ingredients).toHaveCount(0);
      }
      await expect(header.locator('a[href="/upload-test"]')).toHaveCount(0);
      if (width === 390) await page.getByRole('button', { name: 'Menu', exact: true }).click();
    }
  }
});

