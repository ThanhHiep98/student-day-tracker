import { type Page, expect, test } from '@playwright/test';

/**
 * Insights is computed from real Dexie data through the pure helpers
 * (plans/2026-09-26-add-activity.html §2.5 phase 4).
 */
async function addActivity(page: Page, name: string, start: string, end: string) {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What did you do?').fill(name);
  await dialog.getByLabel('Start time').fill(start);
  await dialog.getByLabel('End time').fill(end);
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog).toBeHidden();
}

test.describe('with demo data dismissed', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sdt-install-dismissed', '1');
      localStorage.setItem('sdt-demo-dismissed', '1');
    });
  });

  test('shows the empty and insufficient-data states with no data', async ({ page }) => {
    await page.goto('/insights');
    await expect(
      page.getByRole('heading', { name: 'Nothing tracked this week yet' })
    ).toBeVisible();
    await expect(page.getByText(/Nothing tracked in the same days last week yet/)).toBeVisible();
    await expect(page.getByText('Track a few more days to unlock insights.')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Nothing tracked this month yet' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No activities this month yet' })).toBeVisible();
    await expect(page.getByText('NaN')).toHaveCount(0);
  });

  test('a newly added activity shows up in Weekly, Insight cards and Analytics', async ({
    page,
  }) => {
    await page.goto('/');
    await addActivity(page, 'Deep work session', '09:00', '10:30');

    await page.getByRole('link', { name: 'Insights' }).click();
    await expect(page).toHaveURL('/insights/');

    const weekly = page.getByRole('region', { name: 'Weekly overview' });
    await expect(weekly.getByText('1h 30m').first()).toBeVisible();

    const cards = page.getByRole('region', { name: 'Insight cards' });
    await expect(cards.getByText('Your week')).toBeVisible();
    await expect(
      cards.getByText('Most of your tracked time went to Work — 1h 30m this week.')
    ).toBeVisible();

    const compare = page.getByRole('region', { name: 'Compare' });
    await expect(compare.getByText(/Nothing tracked in the same days last week yet/)).toBeVisible();

    const analytics = page.getByRole('region', { name: 'Activity analytics' });
    await expect(analytics.getByRole('button', { name: 'Deep work session' })).toBeVisible();
    await expect(analytics.getByText('09:00–12:00')).toBeVisible();

    const monthly = page.getByRole('region', { name: 'Monthly overview' });
    await expect(monthly.getByText('Deep work session')).toBeVisible();
  });
});

test.describe('with demo data', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sdt-install-dismissed', '1');
    });
  });

  test('shows the demo banner; Clear removes only demo rows', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Demo data')).toBeVisible();
    await addActivity(page, 'My real task', '06:00', '06:45');

    await page.getByRole('link', { name: 'Insights' }).click();
    await expect(page.getByText('Demo data')).toBeVisible();
    const analytics = page.getByRole('region', { name: 'Activity analytics' });
    await expect(analytics.getByRole('button', { name: 'Gym' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear & start fresh' }).click();

    await expect(page.getByText('Demo data')).toHaveCount(0);
    await expect(analytics.getByRole('button', { name: 'Gym' })).toHaveCount(0);
    await expect(analytics.getByRole('button', { name: 'My real task' })).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Weekly overview' }).getByText('45m').first()
    ).toBeVisible();

    await page.reload();
    await expect(page.getByText('Demo data')).toHaveCount(0);
    await expect(analytics.getByRole('button', { name: 'My real task' })).toBeVisible();
  });

  test('Clear on Insights with only demo data shows the empty states', async ({ page }) => {
    await page.goto('/insights');
    await expect(page.getByText('Demo data')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nothing tracked this week yet' })).toHaveCount(
      0
    );

    await page.getByRole('button', { name: 'Clear & start fresh' }).click();

    await expect(
      page.getByRole('heading', { name: 'Nothing tracked this week yet' })
    ).toBeVisible();
    await expect(page.getByText('Track a few more days to unlock insights.')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Nothing tracked this month yet' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No activities this month yet' })).toBeVisible();
  });
});
