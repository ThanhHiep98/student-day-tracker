import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * F1 (plans/2026-10-01-firebase-setup.html): firebase.json behaves as
 * specified when serving the static export — routes, trailing-slash
 * redirect, 404, cache headers, root-scoped manifest. Runs only via
 * `pnpm build && pnpm test:e2e:hosting` (Hosting emulator, project
 * demo-sdt) or against a real URL with PLAYWRIGHT_BASE_URL.
 *
 * Since F2 every route is behind the auth gate, so a fresh (signed-out)
 * browser sees the sign-in screen ① on each of them; /privacy/ stays public.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt-install-dismissed', '1');
  });
});

for (const path of ['/', '/history/', '/insights/']) {
  test(`${path} returns 200 and shows the sign-in screen when signed out`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });
}

test('/privacy/ returns 200 and is readable signed out', async ({ page }) => {
  const response = await page.goto('/privacy/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Thông báo về quyền riêng tư' })).toBeVisible();
});

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

test('hosted sign-in screen ① has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});
