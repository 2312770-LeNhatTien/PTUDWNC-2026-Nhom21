import { test, expect } from '@playwright/test';
import http from 'http';

const mockRecipe = {
  id: 'rec-seo-001',
  title: 'Phở Bò Gia Truyền Hà Nội',
  slug: 'pho-bo-gia-truyen-ha-noi',
  description: 'Công thức nấu phở bò gia truyền chuẩn vị Hà Nội với nước dùng trong veo, ngọt thanh tự nhiên từ xương bò ninh 8 tiếng.',
  instructions: 'Nấu phở bò chuẩn vị',
  prepTime: 30,
  cookTime: 120,
  servings: 4,
  difficulty: 'Medium',
  status: 'Published',
  publishedAt: '2026-10-28T08:00:00Z',
  category: { id: 'cat-001', name: 'Món nước', slug: 'mon-nuoc' },
  author: { id: 'author-001', displayName: 'Đầu Bếp Tuấn', avatarUrl: 'https://example.com/avatar.jpg' },
  authorDisplayName: 'Đầu Bếp Tuấn',
  nutrition: {
    calories: 450,
    protein: 28,
    carbohydrates: 55,
    fat: 12,
    fiber: 3,
    sodium: 890,
  },
  steps: [
    { id: 'step-1', stepNumber: 1, title: 'Sơ chế xương bò', description: 'Rửa sạch xương bò và chần qua nước sôi gừng 10 phút.', imageUrl: 'https://example.com/step1.jpg' },
    { id: 'step-2', stepNumber: 2, title: 'Ninh nước dùng', description: 'Ninh xương với hành tây nướng, quế, hồi và thảo quả trong 2 tiếng.', imageUrl: null },
    { id: 'step-3', stepNumber: 3, title: 'Hoàn thiện tô phở', description: 'Trần bánh phở, xếp thịt bò tái chín lên trên và chan nước dùng sôi sùng sục.', imageUrl: null },
  ],
  ingredients: [
    { id: 'ing-1', name: 'Xương ống bò', quantity: 1, unit: 'kg' },
    { id: 'ing-2', name: 'Bánh phở tươi', quantity: 500, unit: 'g' },
    { id: 'ing-3', name: 'Thịt bò phi lê', quantity: 300, unit: 'g' },
    { id: 'ing-4', name: 'Hành tây, gừng, hồi, quế', quantity: null, unit: null },
  ],
  images: [
    {
      id: 'img-1',
      originalUrl: 'https://example.com/pho-bo-orig.webp',
      mediumUrl: 'https://example.com/pho-bo-med.webp',
      thumbnailUrl: 'https://example.com/pho-bo-thumb.webp',
      altText: 'Bát phở bò nóng hổi thơm phức',
      isPrimary: true,
    },
  ],
  averageRating: 4.8,
  reviewCount: 25,
};

const mockXssRecipe = {
  ...mockRecipe,
  id: 'rec-seo-xss',
  title: 'Bánh Mì</script><script>window.__xss_executed=true</script>',
  slug: 'banh-mi-xss-test',
  description: 'Mô tả test XSS trong JSON-LD và canonical: </script><script>alert(1)</script>',
};

let mockServer: http.Server;

test.beforeAll(async () => {
  mockServer = http.createServer((req, res) => {
    if (req.url?.includes('banh-mi-xss-test')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ isSuccess: true, data: mockXssRecipe }));
      return;
    }
    if (req.url?.includes('pho-bo-gia-truyen-ha-noi')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ isSuccess: true, data: mockRecipe }));
      return;
    }
    if (req.url?.includes('/categories/mon-nuoc')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        isSuccess: true,
        data: {
          id: 'cat-001',
          name: 'Món nước',
          slug: 'mon-nuoc',
          description: 'Các món nước thơm ngon',
          orderIndex: 1,
          recipeCount: 1,
          recipes: [mockRecipe],
        }
      }));
      return;
    }
    if (req.url?.includes('/categories')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        isSuccess: true,
        data: [{ id: 'cat-001', name: 'Món nước', slug: 'mon-nuoc', recipeCount: 5 }]
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ isSuccess: false, message: 'Not found' }));
  });

  await new Promise<void>((resolve, reject) => {
    mockServer.listen(59987, '127.0.0.1', () => resolve());
    mockServer.on('error', reject);
  });
});

test.afterAll(async () => {
  if (mockServer) {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  }
});

test.describe('P03: SEO Metadata & Schema.org Recipe JSON-LD', () => {
  test('Recipe detail page contains comprehensive OpenGraph and Twitter meta tags', async ({ page }) => {
    await page.goto('/recipes/pho-bo-gia-truyen-ha-noi');

    // Title & Description
    await expect(page).toHaveTitle(/Phở Bò Gia Truyền Hà Nội/);
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /nấu phở bò gia truyền/i);

    // Canonical link
    const canonicalLink = page.locator('link[rel="canonical"]');
    await expect(canonicalLink).toHaveAttribute('href', /.*\/recipes\/pho-bo-gia-truyen-ha-noi/);

    // OpenGraph
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Phở Bò Gia Truyền Hà Nội/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /pho-bo/);

    // Twitter
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', /Phở Bò Gia Truyền Hà Nội/);
  });

  test('Recipe detail page renders valid Schema.org Recipe JSON-LD structured data', async ({ page }) => {
    await page.goto('/recipes/pho-bo-gia-truyen-ha-noi');

    const jsonLdElement = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdElement).toHaveCount(1);

    const jsonLdText = await jsonLdElement.textContent();
    expect(jsonLdText).toBeTruthy();

    const schema = JSON.parse(jsonLdText!);
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Recipe');
    expect(schema.name).toBe('Phở Bò Gia Truyền Hà Nội');
    expect(schema.author['@type']).toBe('Person');
    expect(schema.author.name).toBe('Đầu Bếp Tuấn');
    expect(schema.prepTime).toBe('PT30M');
    expect(schema.cookTime).toBe('PT2H');
    expect(schema.totalTime).toBe('PT2H30M');
    expect(schema.recipeYield).toBe('4 khẩu phần');
    expect(schema.recipeCategory).toBe('Món nước');
    expect(schema.recipeCuisine).toBe('Việt Nam');

    // Ingredients
    expect(schema.recipeIngredient).toHaveLength(4);
    expect(schema.recipeIngredient[0]).toContain('Xương ống bò');

    // Instructions
    expect(schema.recipeInstructions).toHaveLength(3);
    expect(schema.recipeInstructions[0]['@type']).toBe('HowToStep');
    expect(schema.recipeInstructions[0].text).toContain('Rửa sạch xương bò');

    // Nutrition
    expect(schema.nutrition['@type']).toBe('NutritionInformation');
    expect(schema.nutrition.calories).toBe('450 calories');
    expect(schema.nutrition.proteinContent).toBe('28 g');

    // AggregateRating
    expect(schema.aggregateRating['@type']).toBe('AggregateRating');
    expect(schema.aggregateRating.ratingValue).toBe(4.8);
    expect(schema.aggregateRating.reviewCount).toBe(25);
  });

  test('Private routes have robots noindex meta tag', async ({ page }) => {
    await page.goto('/login');
    const robotsLogin = page.locator('meta[name="robots"]');
    await expect(robotsLogin).toHaveAttribute('content', /noindex/);
  });

  test('JSON-LD escapes HTML characters to prevent XSS breakout (P1 fix)', async ({ page }) => {
    await page.goto('/recipes/banh-mi-xss-test');

    // Verify injected script does NOT execute in browser context
    const isXssExecuted = await page.evaluate(() => (window as unknown as { __xss_executed?: boolean }).__xss_executed);
    expect(isXssExecuted).toBeUndefined();

    // Verify raw script tag innerHTML has escaped characters (< replaced with \u003c)
    const rawContent = await page.locator('script[type="application/ld+json"]').innerHTML();
    expect(rawContent).not.toContain('</script><script>');
    expect(rawContent).toContain('\\u003c/script\\u003e');

    // Verify JSON parses cleanly back to the original content
    const parsed = JSON.parse(rawContent);
    expect(parsed.name).toBe('Bánh Mì</script><script>window.__xss_executed=true</script>');
  });

  test('Category pages have explicit canonical URLs distinct from homepage (P2 fix)', async ({ page }) => {
    // 1. /categories list page
    await page.goto('/categories');
    const categoriesCanonical = page.locator('link[rel="canonical"]');
    await expect(categoriesCanonical).toHaveAttribute('href', /.*\/categories$/);

    // 2. /categories/[slug] detail page
    await page.goto('/categories/mon-nuoc');
    const categoryDetailCanonical = page.locator('link[rel="canonical"]');
    await expect(categoryDetailCanonical).toHaveAttribute('href', /.*\/categories\/mon-nuoc$/);
  });
});
