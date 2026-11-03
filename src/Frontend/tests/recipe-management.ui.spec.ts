import { test, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';

test('slow child save preserves core fields typed before the response', async ({ page, context }) => {
  const user = { id: 'ui-owner', displayName: 'UI Author', email: 'ui@example.test', roles: ['Author'] };
  const cookie = await encode({ secret: 'recipes-local-test-secret-only', salt: 'authjs.session-token',
    token: { userId: user.id, roles: user.roles, name: user.displayName, email: user.email } });
  await context.addCookies([{ name: 'authjs.session-token', value: cookie, url: 'http://localhost:3106', httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript(profile => { localStorage.setItem('user', JSON.stringify(profile)); localStorage.setItem('accessToken', 'ui-test-only'); }, user);
  const id = '11111111-1111-1111-1111-111111111111';
  const category = { id: 'category-1', name: 'Món nước', slug: 'mon-nuoc' };
  const recipe = { id, title: 'Tên ban đầu', slug: 'mon-thu', status: 'Draft', description: 'Mô tả', instructions: '',
    category, author: user, prepTime: 10, cookTime: 20, servings: 2, difficulty: 'Easy', ingredients: [] as object[], steps: [], images: [] };
  let release = () => {}; let pending = false; let loads = 0; let version = 'AAAAAAAAAAAAAAAAAAAAAA==';
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/categories', route => route.fulfill({ json: { data: [category] } }));
  await page.route('**/api/v1/recipes/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/edit')) {
      loads++;
      return route.fulfill({ json: { data: { recipe, rowVersion: version, createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z' } } });
    }
    if (path.endsWith('/ingredients')) {
      pending = true; await gate;
      const item = { ...route.request().postDataJSON(), id: 'ingredient-1' }; recipe.ingredients = [item];
      version = 'AQEBAQEBAQEBAQEBAQEBAQ==';
      return route.fulfill({ status: 201, json: { data: item } });
    }
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON();
      expect(input.rowVersion).toBe(version); recipe.title = input.title;
      return route.fulfill({ json: { data: { ...recipe, rowVersion: version } } });
    }
    return route.abort();
  });
  await page.goto(`/dashboard/recipes/${id}/edit`);
  await page.getByPlaceholder('Tên nguyên liệu (VD: Thịt ba chỉ, Nước mắm)...').fill('Muối');
  await page.getByPlaceholder('Số lượng (300)').fill('1/2');
  await page.getByRole('button', { name: 'Thêm (Enter)' }).click();
  await expect.poll(() => pending).toBe(true);
  const title = page.getByLabel('Tiêu đề', { exact: true });
  await title.fill('Nội dung vừa gõ chưa lưu'); release();
  await expect.poll(() => loads).toBe(2);
  await expect(page.getByText('Đang đồng bộ nội dung...')).toHaveCount(0);
  await expect(title).toHaveValue('Nội dung vừa gõ chưa lưu');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu công thức thành công.')).toBeVisible();
});

test('integrated ingredient editor parses fractions and refreshes the version before saving', async ({ page, context }) => {
  const user = { id: 'ui-owner', displayName: 'UI Author', email: 'ui@example.test', roles: ['Author'] };
  const cookie = await encode({ secret: 'recipes-local-test-secret-only', salt: 'authjs.session-token',
    token: { userId: user.id, roles: user.roles, name: user.displayName, email: user.email } });
  await context.addCookies([{ name: 'authjs.session-token', value: cookie, url: 'http://localhost:3106', httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript(profile => { localStorage.setItem('user', JSON.stringify(profile)); localStorage.setItem('accessToken', 'ui-test-only'); }, user);
  const id = '11111111-1111-1111-1111-111111111111';
  const category = { id: 'category-1', name: 'Món nước', slug: 'mon-nuoc' };
  const stamp = '2026-10-28T00:00:00Z';
  const recipe = { id, title: 'Món thử', slug: 'mon-thu', status: 'Draft', description: 'Mô tả', instructions: '',
    category, author: user, prepTime: 10, cookTime: 20, servings: 2, difficulty: 'Easy', ingredients: [] as object[], steps: [], images: [] };
  let version = 'AAAAAAAAAAAAAAAAAAAAAA=='; let submittedQuantity = 0; let failReload = false;
  await page.route('**/api/v1/categories', route => route.fulfill({ json: { data: [category] } }));
  await page.route('**/api/v1/recipes/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/edit')) {
      if (failReload) return route.fulfill({ status: 503, json: { detail: 'Thử lại sau' } });
      return route.fulfill({ json: { data: { recipe, rowVersion: version, createdAt: stamp, updatedAt: stamp } } });
    }
    if (path.endsWith('/ingredients')) {
      const input = route.request().postDataJSON(); submittedQuantity = input.quantity;
      const item = { ...input, id: 'ingredient-1' }; recipe.ingredients = [item]; version = 'AQEBAQEBAQEBAQEBAQEBAQ==';
      return route.fulfill({ status: 201, json: { data: item } });
    }
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON(); expect(input.rowVersion).toBe(version);
      recipe.title = input.title;
      return route.fulfill({ json: { data: { ...recipe, rowVersion: version, createdAt: stamp, updatedAt: stamp } } });
    }
    return route.abort();
  });
  await page.goto(`/dashboard/recipes/${id}/edit`);
  const name = page.getByPlaceholder('Tên nguyên liệu (VD: Thịt ba chỉ, Nước mắm)...');
  await expect(name).toBeEnabled();
  await name.fill('Muối'); await page.getByPlaceholder('Số lượng (300)').fill('1/2');
  await page.getByRole('button', { name: 'Thêm (Enter)' }).click();
  await expect(name).toHaveValue(''); expect(submittedQuantity).toBe(0.5);
  await expect(name).toBeEnabled();
  await page.getByLabel('Tiêu đề', { exact: true }).fill('Món đã sửa');
  await expect(name).toBeDisabled();
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu công thức thành công.')).toBeVisible();
  await expect(name).toBeEnabled();
  // Lưu con thành công nhưng fetch lại lỗi phải khóa lần sửa tiếp theo cho tới khi đồng bộ.
  failReload = true;
  await name.fill('Tiêu'); await page.getByPlaceholder('Số lượng (300)').fill('1/0');
  await page.getByRole('button', { name: 'Thêm (Enter)' }).click();
  await expect(page.getByText('Định lượng không hợp lệ, ví dụ 0.5 hoặc 1/2.')).toBeVisible();
  await page.getByPlaceholder('Số lượng (300)').fill('1 1/2');
  await page.getByRole('button', { name: 'Thêm (Enter)' }).click();
  await expect(page.getByRole('button', { name: 'Đồng bộ lại phiên bản' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
  expect(submittedQuantity).toBe(1.5);
  failReload = false; await page.getByRole('button', { name: 'Đồng bộ lại phiên bản' }).click();
  await expect(name).toBeEnabled();
});

// UI regression with API stubs. This suite does not validate database concurrency;
// recipe-management.spec.ts and recipe-management-api.cjs cover the real backend.
test('dashboard filters, private preview, conflict reload, archive and soft delete UI', async ({ page, context }) => {
  const user = { id: 'ui-owner', displayName: 'UI Author', email: 'ui@example.test', roles: ['Author'] };
  const cookie = await encode({ secret: 'recipes-local-test-secret-only', salt: 'authjs.session-token',
    token: { userId: user.id, roles: user.roles, name: user.displayName, email: user.email } });
  await context.addCookies([{ name: 'authjs.session-token', value: cookie, url: 'http://localhost:3106', httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript(profile => {
    localStorage.setItem('user', JSON.stringify(profile));
    localStorage.setItem('accessToken', 'ui-test-only');
  }, user);
  const category = { id: 'category-1', name: 'Món nước', slug: 'mon-nuoc' };
  const draft = { id: '11111111-1111-1111-1111-111111111111', title: 'Bản nháp riêng', slug: 'ban-nhap-rieng', status: 'Draft',
    description: 'Mô tả công thức', instructions: 'Nấu chín', category, author: user, prepTime: 10, cookTime: 20,
    servings: 2, difficulty: 'Easy', nutrition: { calories: 234 }, ingredients: [], steps: [], images: [] };
  const stamp = '2026-10-20T00:00:00Z';
  let detail = { recipe: { ...draft }, rowVersion: 'AAAAAAAAAAAAAAAAAAAAAA==', createdAt: stamp, updatedAt: stamp };
  let items = [draft, { ...draft, id: 'published', title: 'Bài đã đăng', status: 'Published' }, { ...draft, id: 'archived', title: 'Bài lưu trữ', status: 'Archived' }];
  let conflict = true;
  await page.route('**/api/v1/categories', route => route.fulfill({ json: { data: [category] } }));
  await page.route('**/api/v1/recipes/**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith('/mine')) {
      const status = url.searchParams.get('status');
      const filtered = items.filter(item => !status || item.status === status);
      await route.fulfill({ json: { data: filtered.map(item => ({ ...item, categoryName: category.name, createdAt: stamp, updatedAt: stamp })),
        meta: { page: 1, pageSize: 12, total: filtered.length, totalPages: 1 } } });
    } else if (url.pathname.endsWith('/edit')) await route.fulfill({ json: { data: detail } });
    else if (method === 'PUT') {
      const body = route.request().postDataJSON();
      if (conflict) {
        conflict = false;
        detail = { ...detail, rowVersion: 'AQEBAQEBAQEBAQEBAQEBAQ==', recipe: { ...draft, title: 'Phiên bản trên máy chủ' } };
        await route.fulfill({ status: 409, json: { status: 409, errorCode: 'RECIPE_CONCURRENCY_CONFLICT', detail: 'Phiên bản đã đổi' } });
      } else {
        expect(body.rowVersion).toBe(detail.rowVersion);
        detail = { ...detail, recipe: { ...detail.recipe, title: body.title } };
        await route.fulfill({ json: { data: { ...detail.recipe, rowVersion: detail.rowVersion, createdAt: stamp, updatedAt: stamp } } });
      }
    } else if (url.pathname.endsWith('/archive')) {
      items = items.map(item => item.id === draft.id ? { ...item, status: 'Archived' } : item);
      await route.fulfill({ json: { data: { ...detail, recipe: { ...detail.recipe, status: 'Archived' } } } });
    } else if (method === 'DELETE') {
      items = items.filter(item => item.id !== draft.id);
      await route.fulfill({ status: 204 });
    } else await route.abort();
  });
  await page.goto('/dashboard/recipes');
  for (const [status, title] of [['Draft', draft.title], ['Published', 'Bài đã đăng'], ['Archived', 'Bài lưu trữ']]) {
    await page.getByLabel('Trạng thái', { exact: true }).selectOption(status);
    await expect(page.getByRole('row').filter({ hasText: title })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
  }
  await page.goto(`/dashboard/recipes/${draft.id}/preview`);
  await expect(page.getByRole('heading', { name: draft.title, exact: true })).toBeVisible();
  await page.goto(`/dashboard/recipes/${draft.id}/edit`);
  await page.getByLabel('Tiêu đề', { exact: true }).fill('Nội dung chưa lưu');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Tiêu đề', { exact: true })).toHaveValue('Nội dung chưa lưu');
  await page.getByRole('button', { name: 'Tải lại dữ liệu mới nhất', exact: true }).click();
  await expect(page.getByLabel('Tiêu đề', { exact: true })).toHaveValue('Phiên bản trên máy chủ');
  await page.getByLabel('Tiêu đề', { exact: true }).fill('Lưu sau tải lại');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu công thức thành công.')).toBeVisible();
  await page.goto('/dashboard/recipes');
  const row = page.getByRole('row').filter({ hasText: draft.title });
  await row.getByRole('button', { name: 'Lưu trữ', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận lưu trữ' }).click();
  await expect(page.getByText('Đã lưu trữ công thức.', { exact: true })).toBeVisible();
  await page.getByLabel('Trạng thái', { exact: true }).selectOption('Archived');
  await row.getByRole('button', { name: 'Xóa mềm', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa mềm' }).click();
  await expect(row).toHaveCount(0);
});
