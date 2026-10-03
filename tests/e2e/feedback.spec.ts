import { expect, test } from '@playwright/test';
import { openSignedIn, seedDayRatings } from './support/emulator';

/**
 * Daily satisfaction rating (ADR-009 §1.2 ①③⑤, slice 3 only — warnings, %
 * hiệu quả, AI comments and the parent view are out of scope for this PR).
 */

/** Today as YYYY-MM-DD in the browser's timezone. */
async function browserToday(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

test.describe('Home', () => {
  test('tapping an emoji saves the rating and it survives a reload', async ({ page }) => {
    await openSignedIn(page);
    const card = page.getByRole('region', { name: 'How was your day?' });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: '4 of 5' }).click();
    await expect(card.getByRole('button', { name: '4 of 5' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.reload();
    const reloaded = page.getByRole('region', { name: 'How was your day?' });
    await expect(reloaded.getByRole('button', { name: '4 of 5' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('a note is only saved after Save, with a live counter', async ({ page }) => {
    await openSignedIn(page);
    const card = page.getByRole('region', { name: 'How was your day?' });
    await card.getByRole('button', { name: '5 of 5' }).click();

    const note = card.getByLabel('Optional note');
    await note.fill('Great study session, slept a bit late though.');
    await expect(card.getByText(/\/280/)).toBeVisible();
    await card.getByRole('button', { name: 'Save' }).click();

    await page.reload();
    const reloaded = page.getByRole('region', { name: 'How was your day?' });
    await expect(reloaded.getByLabel('Optional note')).toHaveValue(
      'Great study session, slept a bit late though.'
    );
  });
});

test.describe('History', () => {
  test('shows the rating saved for the selected day', async ({ page }) => {
    const user = await openSignedIn(page);
    const today = await browserToday(page);
    await seedDayRatings(user.uid, [{ date: today, rating: { score: 2, updatedAt: Date.now() } }]);

    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/history/');
    const card = page.getByRole('region', { name: 'How was your day?' });
    await expect(card.getByRole('button', { name: '2 of 5' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

test.describe('Insights', () => {
  test('"How your days felt" shows an emoji per rated day and the average', async ({ page }) => {
    const user = await openSignedIn(page);
    const today = await browserToday(page);
    await seedDayRatings(user.uid, [{ date: today, rating: { score: 4, updatedAt: Date.now() } }]);

    await page.getByRole('link', { name: 'Insights' }).click();
    const trend = page.getByRole('region', { name: 'How your days felt' });
    await expect(trend).toBeVisible();
    await expect(trend.getByText('Average 4.0 / 5.')).toBeVisible();
  });

  test('shows a neutral message when nothing is rated this week', async ({ page }) => {
    await openSignedIn(page, '/insights/');
    const trend = page.getByRole('region', { name: 'How your days felt' });
    await expect(trend.getByText('No ratings yet this week.')).toBeVisible();
  });
});
