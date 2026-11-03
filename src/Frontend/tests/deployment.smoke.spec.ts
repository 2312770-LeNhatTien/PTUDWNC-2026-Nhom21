import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Chạy sau migrate + seed-demo trên compose LOCAL riêng, không dùng DB demo/dev.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAYAAAChS3wfAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABuSURBVGhD7dAhAQBAEITA7d/jc957KoAYg2T3dmZjsGkAg00DGGwawGDTAAabBjDYNIDBpgEMNg1gsGkAg00DGGwawGDTAAabBjDYNIDBpgEMNg1gsGkAg00DGGwawGDTAAabBjDYNIDBpgEMNh8cKKXShmdyNgAAAABJRU5ErkJggg==', 'base64');

test('TLS proxy, verified upload, core flow and durable cleanup on Linux', async ({ request, page, baseURL }) => {
  for (const path of ['/health', '/health/live', '/health/ready', '/', '/robots.txt', '/sitemap.xml'])
    expect((await request.get(path)).status(), path).toBe(200);
  const redirect = await request.get('http://localhost:8088/recipes', { maxRedirects: 0 });
  expect(redirect.status()).toBe(308); expect(redirect.headers().location).toBe(`${baseURL}/recipes`);
  const login = await request.post('/api/v1/auth/login', { data: { email: 'bep_truong_an@culinary.local', password: 'Author@123' } });
  expect(login.status()).toBe(200);
  const session = (await login.json()).data;
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const categories = (await (await request.get('/api/v1/categories')).json()).data;
  const created = await request.post('/api/v1/recipes', { headers, data: {
    title: `HTTPS Lab8 ${Date.now()}`, description: 'Kiểm chứng luồng thật qua proxy', instructions: 'Nấu chín',
    categoryId: categories[0].id, prepTime: 10, cookTime: 20, servings: 2, difficulty: 'Easy',
    ingredients: [{ name: 'Muối' }], steps: [{ title: 'Nấu', description: 'Đun sôi' }],
  } });
  expect(created.status()).toBe(201); const recipe = (await created.json()).data;
  const upload = async () => {
    // Dùng contract upload đã ghép trên main, không mở lại presigned PUT cũ.
    const response = await request.post('/api/v1/files/upload', { headers, multipart: {
      file: { name: 'picture.png', mimeType: 'image/png', buffer: png }, folder: 'recipes',
    } });
    expect(response.status()).toBe(200);
    const uploaded = (await response.json()).data;
    expect(uploaded.url).toMatch(/^https:\/\/localhost:9443\//);
    expect((await request.get(uploaded.url)).status()).toBe(200);
    const attached = await request.post(`/api/v1/recipes/${recipe.id}/images`, { headers, data: { originalUrl: uploaded.url } });
    expect(attached.status()).toBe(201); return (await attached.json()).data;
  };
  const retained = await upload(); const removed = await upload();
  let images: { id: string; thumbnailUrl: string; mediumUrl: string; originalUrl: string }[] = [];
  await expect.poll(async () => {
    const edit = (await (await request.get(`/api/v1/recipes/${recipe.id}/edit`, { headers })).json()).data;
    images = edit.recipe.images;
    return images.filter(image => image.thumbnailUrl && image.mediumUrl).length;
  }, { timeout: 60000, intervals: [500, 1000, 2000] }).toBe(2);
  for (const image of images) for (const url of [image.originalUrl, image.thumbnailUrl, image.mediumUrl])
    expect((await request.get(url)).status()).toBe(200);
  const thumbnail = images.find(image => image.id === retained.id)!.thumbnailUrl;
  await page.goto('/');
  const dimensions = await page.evaluate(async url => {
    const image = new Image(); image.src = url; await image.decode(); return [image.naturalWidth, image.naturalHeight];
  }, thumbnail);
  expect(dimensions).toEqual([300, 300]);
  const deleted = images.find(image => image.id === removed.id)!;
  expect((await request.delete(`/api/v1/recipes/${recipe.id}/images/${removed.id}`, { headers })).status()).toBe(204);
  for (const url of [deleted.originalUrl, deleted.thumbnailUrl, deleted.mediumUrl])
    await expect.poll(async () => (await request.get(url)).status(), { timeout: 45000, intervals: [500, 1000, 2000] }).toBe(404);
  expect((await request.patch(`/api/v1/recipes/${recipe.id}/publish`, { headers })).status()).toBe(200);
  await page.goto(`/recipes/${recipe.slug}`);
  await expect(page.getByRole('heading', { name: recipe.title, exact: true })).toBeVisible();
  const adminLogin = await request.post('/api/v1/auth/login', { data: { email: 'admin@culinary.local', password: 'Admin@123' } });
  expect(adminLogin.status()).toBe(200);
  const admin = (await adminLogin.json()).data;
  expect((await request.post('/api/v1/admin/hangfire/sitemap', {
    headers: { Authorization: `Bearer ${admin.accessToken}` },
  })).status()).toBe(202);
  await expect.poll(async () => (await (await request.get('/sitemap.xml')).text()),
    { timeout: 30000 }).toContain(`/recipes/${recipe.slug}`);
  // Chỉ lưu ID/URL công khai để đối chiếu backup, không ghi token đăng nhập.
  mkdirSync('../../artifacts/lab8', { recursive: true });
  writeFileSync('../../artifacts/lab8/deployment-smoke-evidence.json', JSON.stringify({ recipeId: recipe.id, slug: recipe.slug,
    originalUrl: images.find(image => image.id === retained.id)!.originalUrl, thumbnailUrl: thumbnail }, null, 2));
});

test('Admin cookie is Secure and dashboard is usable behind HTTPS', async ({ page, request }) => {
  expect((await request.get('/hangfire')).status()).toBe(401);
  await page.goto('/admin/jobs');
  await page.getByLabel(/Địa chỉ Email/).fill('admin@culinary.local');
  await page.getByRole('textbox', { name: 'Mật khẩu *', exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/jobs$/, { timeout: 45000 });
  await page.getByRole('button', { name: 'Mở bảng tác vụ' }).click();
  await expect(page).toHaveURL(/\/hangfire\/?$/);
  await expect(page.getByText('Culinary Blog — Tác vụ nền')).toBeVisible();
  const cookie = (await page.context().cookies()).find(item => item.name === '.Culinary.Hangfire');
  expect(cookie?.secure).toBe(true); expect(cookie?.httpOnly).toBe(true); expect(cookie?.path).toBe('/hangfire');
  const xml = await request.get('/sitemap.xml'); expect(xml.status()).toBe(200);
  expect(await xml.text()).toContain('https://localhost:8443/recipes');
});

test('recreate keeps dashboard cookie and SEO through persistent volumes', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', { data: { email: 'admin@culinary.local', password: 'Admin@123' } });
  expect(response.status()).toBe(200);
  const session = (await response.json()).data;
  expect((await request.post('/api/v1/admin/hangfire/session', {
    headers: { Authorization: `Bearer ${session.accessToken}` }, data: { refreshToken: session.refreshToken },
  })).status()).toBe(204);
  expect((await request.get('/hangfire')).status()).toBe(200);
  const before = await (await request.get('/sitemap.xml')).text();
  // Recreate app thật để kiểm tra key ring/SEO volume, không chỉ restart cùng tiến trình.
  execFileSync('docker', ['compose', '--env-file', process.env.DEPLOYMENT_ENV_FILE || '.env.production.local',
    '-f', 'docker-compose.prod.yml', '-f', 'docker-compose.lab8.yml', 'up', '-d', '--no-deps', '--force-recreate', '--wait',
    '--wait-timeout', '90', 'api', 'frontend', 'nginx'], { cwd: resolve('../..'), stdio: 'pipe', timeout: 110000 });
  expect((await request.get('/hangfire')).status()).toBe(200);
  expect(await (await request.get('/sitemap.xml')).text()).toBe(before);
});
