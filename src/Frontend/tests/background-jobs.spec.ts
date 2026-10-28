import { test, expect } from '@playwright/test';

// Run only against the isolated, seeded test database (see README_JOBS).
const api = 'http://localhost:5107';
test('Admin dashboard, cookie revocation, recurring trigger and public SEO rewrites', async ({ page, playwright }) => {
  const client = await playwright.request.newContext();
  const login = async (email: string, password: string) => {
    const r = await client.post(`${api}/api/v1/auth/login`, { data: { email, password } });
    expect(r.status()).toBe(200);
    return (await r.json()).data;
  };
  let admin = await login('admin@culinary.local', 'Admin@123');
  const author = await login('bep_truong_an@culinary.local', 'Author@123');
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const session = (token: string, refreshToken: string) => client.post(`${api}/api/v1/admin/hangfire/session`, { headers: auth(token), data: { refreshToken } });
  try {
    for (const path of ['/hangfire', '/hangfire/recurring', '/hangfire/stats', '/hangfire/css']) {
      expect((await client.get(api + path)).status()).toBe(401);
      expect((await client.get(api + path, { headers: auth(admin.accessToken) })).status()).toBe(401);
    }
    expect((await session(author.accessToken, author.refreshToken)).status()).toBe(403);
    expect((await session(admin.accessToken, author.refreshToken)).status()).toBe(401);
    expect((await session(admin.accessToken, 'invalid')).status()).toBe(401);
    const grant = await session(admin.accessToken, admin.refreshToken);
    expect(grant.status()).toBe(204);
    const cookie = grant.headers()['set-cookie'];
    expect(cookie).toMatch(/path=\/hangfire/i);
    expect(cookie).toMatch(/httponly/i);
    expect(cookie).toMatch(/samesite=strict/i);
    expect((await client.get(`${api}/hangfire`)).status()).toBe(200);
    expect((await client.post(`${api}/api/v1/admin/hangfire/sitemap`)).status()).toBe(401);
    expect((await client.post(`${api}/api/v1/admin/hangfire/sitemap`, { headers: auth(author.accessToken) })).status()).toBe(403);
    const rotated = await client.post(`${api}/api/v1/auth/refresh`, { data: { refreshToken: admin.refreshToken } });
    expect(rotated.status()).toBe(200);
    admin = (await rotated.json()).data;
    expect((await client.get(`${api}/hangfire`)).status()).toBe(401);
    expect((await session(admin.accessToken, admin.refreshToken)).status()).toBe(204);
    const replay = (await client.storageState()).cookies.find(c => c.name === '.Culinary.Hangfire')!;
    expect((await client.post(`${api}/api/v1/auth/logout`, { headers: auth(admin.accessToken), data: { refreshToken: admin.refreshToken } })).status()).toBe(204);
    expect((await client.get(`${api}/hangfire`, { headers: { Cookie: `${replay.name}=${replay.value}` } })).status()).toBe(401);

    await page.goto('/admin/jobs');
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel(/Địa chỉ Email/).fill('admin@culinary.local');
    await page.getByRole('textbox', { name: 'Mật khẩu *', exact: true }).fill('Admin@123');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/jobs$/, { timeout: 45000 });
    // Simulate an expired JWT once; refresh and token rotation still hit the real API.
    let expired = true;
    await page.route('**/api/v1/admin/hangfire/session', route => {
      if (expired) { expired = false; return route.fulfill({ status: 401 }); }
      return route.continue();
    });
    await page.getByRole('button', { name: 'Mở bảng tác vụ' }).click();
    await expect(page).toHaveURL(`${api}/hangfire`);
    await expect(page.getByText('Culinary Blog — Tác vụ nền')).toBeVisible();
    await page.getByRole('link', { name: /Recurring Jobs/ }).click();
    const row = page.getByRole('row').filter({ hasText: 'sitemap-daily' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('0 2 * * *');
    await expect(row).toContainText('UTC');
    await row.getByRole('checkbox').check();
    // Hangfire reload cùng URL sau trigger; chờ trang mới trước khi evaluate DOM.
    const [, triggered] = await Promise.all([
      page.waitForEvent('domcontentloaded'),
      page.waitForResponse(response => response.url().endsWith('/hangfire/recurring/trigger') && response.request().method() === 'POST'),
      page.getByRole('button', { name: /Trigger now/ }).click(),
    ]);
    expect(triggered.ok()).toBe(true);
    // Reload xóa lựa chọn checkbox, nên nút trigger trở về disabled.
    await expect(row.getByRole('checkbox')).not.toBeChecked();
    await expect(page.getByRole('button', { name: /Trigger now/ })).toBeDisabled();
    await expect(row).toBeVisible();
    await page.waitForLoadState('load');
    const assets = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => /\/hangfire\/(css|js)/.test(e.name)).length);
    expect(assets).toBeGreaterThan(0);
    const xml = await page.request.get('/sitemap.xml');
    expect(xml.status()).toBe(200);
    expect(xml.headers()['cache-control']).toContain('no-cache');
    const doc = await page.evaluate(text => {
      const parsed = new DOMParser().parseFromString(text, 'application/xml');
      return { errors: parsed.querySelectorAll('parsererror').length, namespace: parsed.documentElement.namespaceURI,
        urls: Array.from(parsed.querySelectorAll('loc')).map(e => e.textContent) };
    }, await xml.text());
    expect(doc.errors).toBe(0);
    expect(doc.namespace).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
    expect(doc.urls.length).toBeGreaterThan(100);
    expect(doc.urls.every(url => url?.startsWith('http://localhost:3107/'))).toBe(true);
    expect(doc.urls).toContain('http://localhost:3107/recipes');
    expect(new Set(doc.urls).size).toBe(doc.urls.length);
    expect(await (await page.request.get('/robots.txt')).text()).toContain('Sitemap: http://localhost:3107/sitemap.xml');
    await page.screenshot({ path: '../../artifacts/lab7/hangfire.png', fullPage: true });
  } finally { await client.dispose(); }
});

test('sitemap follows publish, archive and soft-delete without pagination/cache', async ({ playwright }) => {
  const client = await playwright.request.newContext();
  const login = await client.post(`${api}/api/v1/auth/login`, { data: { email: 'bep_truong_an@culinary.local', password: 'Author@123' } });
  expect(login.status()).toBe(200);
  const token = (await login.json()).data.accessToken;
  const adminLogin = await client.post(`${api}/api/v1/auth/login`, { data: { email: 'admin@culinary.local', password: 'Admin@123' } });
  expect(adminLogin.status()).toBe(200);
  const admin = (await adminLogin.json()).data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  const trigger = async () => {
    expect((await client.post(`${api}/api/v1/admin/hangfire/sitemap`, { headers: { Authorization: `Bearer ${admin}` } })).status()).toBe(202);
  };
  const category = (await (await client.get(`${api}/api/v1/categories`)).json()).data[0];
  const payload = { title: `SEO public lifecycle ${Date.now()}`, description: 'Kiểm tra tập URL public', instructions: 'Nấu chín', categoryId: category.id,
    prepTime: 10, cookTime: 20, servings: 2, difficulty: 'Easy', ingredients: [{ name: 'Gạo', quantity: 1, unit: 'kg' }], steps: [{ title: 'Nấu', description: 'Nấu chín' }] };
  const created = await client.post(`${api}/api/v1/recipes`, { headers, data: payload });
  expect(created.status()).toBe(201);
  const recipe = (await created.json()).data;
  const categoryResponse = await client.post(`${api}/api/v1/categories`, { headers: { Authorization: `Bearer ${admin}` }, data: { name: `SEO category ${Date.now()}` } });
  expect(categoryResponse.status()).toBe(201);
  const testCategory = (await categoryResponse.json()).data;
  const categoryLoc = `http://localhost:3107/categories/${testCategory.slug}`;
  const loc = `http://localhost:3107/recipes/${recipe.slug}`;
  const xml = async () => (await client.get(`${api}/sitemap.xml`)).text();
  const waitFor = async (included: boolean) => expect.poll(async () => (await xml()).includes(loc), { timeout: 45000, intervals: [500, 1000] }).toBe(included);
  try {
    await trigger();
    await expect.poll(async () => (await xml()).includes(categoryLoc), { timeout: 45000 }).toBe(true);
    await waitFor(false);
    expect((await client.delete(`${api}/api/v1/categories/${testCategory.id}`, { headers: { Authorization: `Bearer ${admin}` } })).status()).toBe(204);
    expect((await client.patch(`${api}/api/v1/recipes/${recipe.id}/publish`, { headers })).status()).toBe(200);
    await trigger(); await waitFor(true);
    expect(await xml()).not.toContain(categoryLoc);
    expect((await client.patch(`${api}/api/v1/recipes/${recipe.id}/archive`, { headers })).status()).toBe(200);
    await trigger(); await waitFor(false);
    expect((await client.patch(`${api}/api/v1/recipes/${recipe.id}/publish`, { headers })).status()).toBe(200);
    await trigger(); await waitFor(true);
    expect((await client.delete(`${api}/api/v1/recipes/${recipe.id}`, { headers })).status()).toBe(204);
    await trigger(); await waitFor(false);
  } finally {
    await client.delete(`${api}/api/v1/recipes/${recipe.id}`, { headers });
    await client.delete(`${api}/api/v1/categories/${testCategory.id}`, { headers: { Authorization: `Bearer ${admin}` } });
    await client.dispose();
  }
});
