const assert = require('node:assert/strict');
const base = process.env.RECIPES_TEST_API_URL || 'http://localhost:5106/api/v1';
async function req(path, method = 'GET', body, token) {
  const response = await fetch(base + path, { method, headers: {
    'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function main() {
  const login = await req('/auth/login', 'POST', { email: 'bep_truong_an@culinary.local', password: 'Author@123' });
  assert.equal(login.status, 200);
  const token = login.body.data.accessToken;
  const authorLogin = await req('/auth/login', 'POST', { email: 'ha_bep_nha@culinary.local', password: 'Author@123' });
  assert.equal(authorLogin.status, 200);
  const otherToken = authorLogin.body.data.accessToken;
  const categoryId = (await req('/categories')).body.data[0].id;
  const payload = { title: `Recipe integration ${Date.now()}`, description: 'Kiểm tra quản lý công thức', instructions: 'Hướng dẫn', categoryId, prepTime: 10, cookTime: 20, servings: 2, difficulty: 'Easy', nutrition: { calories: 123 }, ingredients: [{ name: 'Gạo', quantity: 1, unit: 'kg' }], steps: [{ title: 'Nấu', description: 'Nấu chín' }] };
  const created = await req('/recipes', 'POST', payload, token);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.data.id;
  const path = `/recipes/${id}`;
  try {
    assert.equal((await req('/recipes/mine')).status, 401);
    assert.equal((await req(`${path}/edit`)).status, 401);
    for (const [suffix, method, body] of [['/edit', 'GET'], ['/archive', 'PATCH'], ['', 'DELETE'], ['', 'PUT', { ...payload, rowVersion: Buffer.alloc(16).toString('base64') }]]) {
      assert.equal((await req(path + suffix, method, body, otherToken)).status, 403, `Non-owner ${method} ${suffix}`);
    }
    const othersMine = await req('/recipes/mine?pageSize=100', 'GET', undefined, otherToken);
    assert.ok(!othersMine.body.data.some(r => r.id === id));
    const asc = (await req('/recipes/mine?pageSize=100&sortBy=title&sortOrder=asc', 'GET', undefined, otherToken)).body.data;
    const desc = (await req('/recipes/mine?pageSize=100&sortBy=title&sortOrder=desc', 'GET', undefined, otherToken)).body.data;
    assert.ok(asc.length > 1);
    assert.deepEqual(asc.map(r => r.id), desc.map(r => r.id).reverse(), 'D8 title direction');
    const shorthand = (await req('/recipes/mine?pageSize=100&sort=title', 'GET', undefined, otherToken)).body.data;
    assert.deepEqual(shorthand.map(r => r.id), asc.map(r => r.id), 'D8 shorthand');
    const before = (await req(`${path}/edit`, 'GET', undefined, token)).body.data;
    assert.equal(Buffer.from(before.rowVersion, 'base64').length, 16);
    assert.equal(before.recipe.status, 'Draft');
    assert.ok(new Date(before.createdAt).getFullYear() >= 2026);
    const mine = await req('/recipes/mine?status=Draft&pageSize=100', 'GET', undefined, token);
    assert.ok(mine.body.data.some(r => r.id === id));
    assert.ok([403, 404].includes((await req(`/recipes/${before.recipe.slug}`)).status));
    const update = { ...payload, title: payload.title + ' sửa', rowVersion: before.rowVersion };
    const saved = await req(path, 'PUT', update, token);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.notEqual(saved.body.data.rowVersion, before.rowVersion);
    assert.equal(saved.body.data.id, id, 'PUT must preserve flat recipe contract');
    assert.equal(saved.body.data.recipe, undefined);
    assert.equal(saved.body.data.nutrition.calories, 123);
    assert.equal(saved.body.data.ingredients.length, 1);
    assert.equal(saved.body.data.steps.length, 1);
    const stale = await req(path, 'PUT', update, token);
    assert.equal(stale.status, 409);
    assert.equal(stale.body.errorCode, 'RECIPE_CONCURRENCY_CONFLICT');
    const invalid = await req(path, 'PUT', { ...update, rowVersion: '' }, token);
    assert.equal(invalid.status, 400);
    const child = await req(`${path}/ingredients`, 'POST', { name: 'Muối' }, token);
    assert.equal(child.status, 201, JSON.stringify(child.body));
    const afterChild = (await req(`${path}/edit`, 'GET', undefined, token)).body.data;
    assert.notEqual(afterChild.rowVersion, saved.body.data.rowVersion, 'Child changes must rotate parent version');
    assert.equal((await req(path, 'PUT', { ...update, rowVersion: saved.body.data.rowVersion }, token)).status, 409);
    const concurrent = await Promise.all([1, 2].map(n => req(path, 'PUT', { ...update, title: `${payload.title} concurrent ${n}`, rowVersion: afterChild.rowVersion }, token)));
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
    const archived = await req(`${path}/archive`, 'PATCH', undefined, token);
    assert.equal(archived.status, 200, JSON.stringify(archived.body));
    assert.equal(archived.body.data.recipe.status, 'Archived');
    const list = (await req('/recipes/mine?status=Archived&pageSize=100', 'GET', undefined, token)).body;
    assert.ok(list.data.some(r => r.id === id));
    assert.equal((await req(path, 'DELETE', undefined, token)).status, 204);
    assert.equal((await req(`${path}/edit`, 'GET', undefined, token)).status, 404);
    const remaining = (await req('/recipes/mine?pageSize=100', 'GET', undefined, token)).body;
    assert.ok(!remaining.data.some(r => r.id === id));
    console.log('PASS recipe management: private preview, own list/filter, validation, nutrition/children preservation, stale and concurrent updates, child version, archive, soft-delete.');
  } finally { await req(path, 'DELETE', undefined, token); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
