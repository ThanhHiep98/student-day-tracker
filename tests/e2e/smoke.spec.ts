import { expect, test } from '@playwright/test';
import { openSignedIn } from './support/emulator';

/**
 * Smoke test: the three top-level sections from the requirement doc
 * (Home / History / Insights) render for a signed-in user and the nav links
 * between them. Signed-out behaviour lives in auth.spec.ts.
 */
test.beforeEach(async ({ page }) => {
  await openSignedIn(page);
});

test('Home renders the daily summary and an empty timeline', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
});

test('nav bar moves between Home, History, and Insights', async ({ page }) => {
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page).toHaveURL('/history/');
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page).toHaveURL('/insights/');
  await expect(page.getByRole('heading', { name: 'Insights', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly overview' })).toBeVisible();

  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL('/');
});

test('History calendar lets a day be selected', async ({ page }) => {
  await page.goto('/history');
  const today = new Date();
  await page
    .getByRole('button', { name: String(today.getDate()) })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
});
