import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * F1 (plans/2026-10-01-firebase-setup.html): firebase.json behaves as
 * specified when serving the static export — routes, trailing-slash
 * redirect, 404, cache headers, root-scoped manifest. Runs only via
 * `pnpm build && pnpm test:e2e:hosting` (Hosting emulator, project
 * demo-sdt) or against a real URL with PLAYWRIGHT_BASE_URL.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt-install-dismissed', '1');
  });
});

const routes = [
  { path: '/', heading: /good (morning|afternoon|evening)/i },
  { path: '/history/', heading: 'History' },
  { path: '/insights/', heading: 'Insights' },
] as const;

for (const { path, heading } of routes) {
  test(`${path} returns 200 and renders its heading`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
  });
}

test('/history redirects to /history/', async ({ request }) => {
  const response = await request.get('/history', { maxRedirects: 0 });
  expect([301, 302, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(/\/history\/$/);
});

test('an unknown path returns the 404 page', async ({ request }) => {
  const response = await request.get('/definitely-not-a-route/');
  expect(response.status()).toBe(404);
});

test('/sw.js is never cached long-term', async ({ request }) => {
  const response = await request.get('/sw.js');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-cache');
});

test('hashed /_next/static assets are cached forever', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const asset = html.match(/\/_next\/static\/[^"'\s>]+\.js/)?.[0];
  expect(asset, 'expected a /_next/static/*.js asset referenced from /').toBeDefined();

  const response = await request.get(asset as string);
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});

test('the manifest is scoped to the domain root', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.status()).toBe(200);
  const manifest = (await response.json()) as { start_url: string; scope: string };
  expect(manifest.start_url).toBe('/');
  expect(manifest.scope).toBe('/');
});

test('hosted / has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })
  ).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});
