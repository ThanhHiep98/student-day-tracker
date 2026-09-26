import { expect, test } from '@playwright/test';

/**
 * Environment-scaffold smoke test: the three top-level sections from the
 * requirement doc (Home / History / Insights) render and the nav links
 * between them. Deeper flows (add/edit/delete activity, charts) are feature
 * work for the Implement agent — see CLAUDE.md.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt-install-dismissed', '1');
  });
});

test('Home renders the daily summary and an empty timeline', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
});

test('nav bar moves between Home, History, and Insights', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page).toHaveURL('/history');
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page).toHaveURL('/insights');
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
