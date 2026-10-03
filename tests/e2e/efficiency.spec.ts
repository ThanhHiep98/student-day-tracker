import { type Page, expect, test } from '@playwright/test';
import { openSignedIn, openSignedInWithGoals, seedActivities } from './support/emulator';
import { sampleHabitGoals } from './support/sample-goals';

/**
 * % hiệu quả (ADR-009 §1.2 ④⑤, slice 5): the welcome-back dialog on Home
 * (D8 — once per day, for yesterday, only with data) and the Insights
 * "% hiệu quả · this week" section. AI comments and the parent view are
 * later PRs; the dialog's comment here is always slice 4's rule-based
 * output.
 */

/** `{ today, yesterday }` as YYYY-MM-DD in the browser's timezone. */
async function browserDates(page: Page) {
  return page.evaluate(() => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { today: fmt(today), yesterday: fmt(yesterday) };
  });
}

test.describe('Home — welcome-back dialog (ADR-009 ④, slice 5)', () => {
  test('shows once the first time Home loads, with the ring, per-goal bars and a rule-based comment', async ({
    page,
  }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    const { yesterday } = await browserDates(page);
    await seedActivities(user.uid, [
      // Short sleep (6h10m < 7h30m target) and entertainment over its 1h30m cap,
      // so buildRuleComments has something neutral-but-specific to say.
      {
        id: 'y-sleep',
        categoryId: 'sleep',
        name: 'Sleep',
        date: yesterday,
        startMinutes: 40,
        endMinutes: 410,
        createdAt: 1,
      },
      {
        id: 'y-entertainment',
        categoryId: 'entertainment',
        name: 'Gaming',
        date: yesterday,
        startMinutes: 600,
        endMinutes: 730,
        createdAt: 2,
      },
      {
        id: 'y-self-study',
        categoryId: 'self-study',
        name: 'Revision',
        date: yesterday,
        startMinutes: 800,
        endMinutes: 900,
        createdAt: 3,
      },
    ]);
    await page.reload();

    const dialog = page.getByRole('dialog', { name: /Yesterday/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/You hit \d+% of your plan\./)).toBeVisible();
    await expect(dialog.getByText('Sleep')).toBeVisible();
    await expect(dialog.getByText('Entertainment')).toBeVisible();
    await expect(dialog.getByText('Self-study')).toBeVisible();
    await expect(dialog.getByText('Rule-based')).toBeVisible();

    await dialog.getByRole('button', { name: 'Start today' }).click();
    await expect(dialog).toBeHidden();
  });

  test('does not reopen on a reload later the same day, even without closing it first (D8)', async ({
    page,
  }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    const { yesterday } = await browserDates(page);
    await seedActivities(user.uid, [
      {
        id: 'y-sleep',
        categoryId: 'sleep',
        name: 'Sleep',
        date: yesterday,
        startMinutes: 0,
        endMinutes: 420,
        createdAt: 1,
      },
    ]);
    await page.reload();
    await expect(page.getByRole('dialog', { name: /Yesterday/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('dialog', { name: /Yesterday/ })).toHaveCount(0);
  });

  test('does not show when yesterday has no activities', async ({ page }) => {
    await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    await expect(page.getByRole('dialog', { name: /Yesterday/ })).toHaveCount(0);
  });

  test('renders nothing before Habits & goals is completed', async ({ page }) => {
    await openSignedIn(page);
    await expect(page.getByRole('dialog', { name: /Yesterday/ })).toHaveCount(0);
  });

  test('"Rate yesterday" reveals the rating card for yesterday inline', async ({ page }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    const { yesterday } = await browserDates(page);
    await seedActivities(user.uid, [
      {
        id: 'y-sleep',
        categoryId: 'sleep',
        name: 'Sleep',
        date: yesterday,
        startMinutes: 0,
        endMinutes: 420,
        createdAt: 1,
      },
    ]);
    await page.reload();

    const dialog = page.getByRole('dialog', { name: /Yesterday/ });
    await dialog.getByRole('button', { name: /Rate yesterday/ }).click();
    const ratingCard = dialog.getByRole('region', { name: 'How was your day?' });
    await expect(ratingCard).toBeVisible();

    await ratingCard.getByRole('button', { name: '4 of 5' }).click();
    await expect(ratingCard.getByRole('button', { name: '4 of 5' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

test.describe('Insights — "% hiệu quả · this week" (ADR-009 ⑤, slice 5)', () => {
  test('shows the week average ring, a daily bar, and per-goal bars', async ({ page }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    const { yesterday } = await browserDates(page);
    await seedActivities(user.uid, [
      {
        id: 'y-self-study',
        categoryId: 'self-study',
        name: 'Revision',
        date: yesterday,
        startMinutes: 0,
        endMinutes: 90,
        createdAt: 1,
      },
      {
        id: 'y-entertainment',
        categoryId: 'entertainment',
        name: 'Gaming',
        date: yesterday,
        startMinutes: 100,
        endMinutes: 160,
        createdAt: 2,
      },
    ]);

    await page.getByRole('link', { name: 'Insights' }).click();
    const section = page.getByRole('region', { name: '% hiệu quả · this week' });
    await expect(section).toBeVisible();
    // The week average ring and at least one tracked day both read a percent.
    await expect(section.getByText(/^\d+%$/).first()).toBeVisible();
    await expect(section.getByText('Self-study')).toBeVisible();
    await expect(section.getByText('Entertainment')).toBeVisible();
  });

  test('shows "–" for every day and goal with nothing tracked this week', async ({ page }) => {
    await openSignedInWithGoals(page, sampleHabitGoals(Date.now()), '/insights/');
    const section = page.getByRole('region', { name: '% hiệu quả · this week' });
    await expect(section).toBeVisible();
    await expect(section.getByText('–').first()).toBeVisible();
  });

  test('renders nothing before Habits & goals is completed', async ({ page }) => {
    await openSignedIn(page, '/insights/');
    await expect(page.getByRole('region', { name: '% hiệu quả · this week' })).toHaveCount(0);
  });
});
