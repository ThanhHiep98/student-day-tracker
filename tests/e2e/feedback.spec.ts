import { expect, test } from '@playwright/test';
import { openSignedIn, seedActivities, seedDayRatings, seedHabitGoals } from './support/emulator';
import { sampleHabitGoals } from './support/sample-goals';

/**
 * Daily satisfaction rating (ADR-009 §1.2 ①③⑤, slice 3) and goal-violation
 * warnings + rule-based comments (§1.2 ①②⑥, slice 4 — % hiệu quả, AI
 * comments and the parent view are later PRs).
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

test.describe('Home — "Today vs your plan" (slice 4)', () => {
  test("shows each goal's status and the bedtime nudge, matching ADR-009 ①", async ({ page }) => {
    const user = await openSignedIn(page);
    const today = await browserToday(page);
    await seedHabitGoals(user.uid, sampleHabitGoals(Date.now()));
    await seedActivities(user.uid, [
      {
        id: 'sleep-1',
        categoryId: 'sleep',
        name: 'Sleep',
        date: today,
        startMinutes: 40,
        endMinutes: 410,
        createdAt: 1,
      },
      {
        id: 'entertainment-1',
        categoryId: 'entertainment',
        name: 'Gaming',
        date: today,
        startMinutes: 600,
        endMinutes: 670,
        createdAt: 2,
      },
      {
        id: 'self-study-1',
        categoryId: 'self-study',
        name: 'Revision',
        date: today,
        startMinutes: 700,
        endMinutes: 790,
        createdAt: 3,
      },
      {
        id: 'extra-class-1',
        categoryId: 'extra-class',
        name: 'Extra math',
        date: today,
        startMinutes: 800,
        endMinutes: 920,
        createdAt: 4,
      },
      {
        id: 'meals-1',
        categoryId: 'meals',
        name: 'Lunch',
        date: today,
        startMinutes: 930,
        endMinutes: 975,
        createdAt: 5,
      },
    ]);
    await page.reload();

    const card = page.getByRole('region', { name: 'Today vs your plan' });
    await expect(card).toBeVisible();
    await expect(card.getByText('Slept 6h 10m')).toBeVisible();
    await expect(card.getByText('1h 20m under 7h 30m')).toBeVisible();
    await expect(card.getByText('Entertainment 1h 10m')).toBeVisible();
    await expect(card.getByText('within 1h 30m')).toBeVisible();
    await expect(card.getByText('Self-study 1h 30m')).toBeVisible();
    await expect(card.getByText('1h 30m to go')).toBeVisible();
    await expect(card.getByText('Extra class 2h')).toBeVisible();
    await expect(card.getByText('Meals 45m')).toBeVisible();
    await expect(card.getByText('so far')).toBeVisible();
    await expect(
      card.getByText(
        'You went to bed at 00:40 — 1h 40m later than your 23:00 plan. An earlier night today would get you back on track.'
      )
    ).toBeVisible();
  });

  test('warns live once entertainment goes over its cap', async ({ page }) => {
    const user = await openSignedIn(page);
    const today = await browserToday(page);
    await seedHabitGoals(user.uid, sampleHabitGoals(Date.now()));
    await seedActivities(user.uid, [
      {
        id: 'entertainment-over',
        categoryId: 'entertainment',
        name: 'Gaming',
        date: today,
        startMinutes: 0,
        endMinutes: 130,
        createdAt: 1,
      },
    ]);
    await page.reload();

    const card = page.getByRole('region', { name: 'Today vs your plan' });
    await expect(card.getByText('40m over the 1h 30m cap')).toBeVisible();
  });

  test('renders nothing before Habits & goals is completed', async ({ page }) => {
    await openSignedIn(page);
    await expect(page.getByRole('region', { name: 'Today vs your plan' })).toHaveCount(0);
    await expect(page.getByText('Finish setting up your day')).toBeVisible();
  });
});

test.describe('Insights — "Comments on your week" (slice 4)', () => {
  test('shows the rule-based label and template sentences', async ({ page }) => {
    const user = await openSignedIn(page);
    const today = await browserToday(page);
    await seedHabitGoals(user.uid, sampleHabitGoals(Date.now()));
    // One tracked, ended day with a short sleep and an entertainment overrun.
    const yesterday = new Date(`${today}T00:00:00`);
    yesterday.setDate(yesterday.getDate() - 1);
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    await seedActivities(user.uid, [
      {
        id: 'y-sleep',
        categoryId: 'sleep',
        name: 'Sleep',
        date: y,
        startMinutes: 0,
        endMinutes: 378,
        createdAt: 1,
      },
      {
        id: 'y-entertainment',
        categoryId: 'entertainment',
        name: 'Gaming',
        date: y,
        startMinutes: 500,
        endMinutes: 620,
        createdAt: 2,
      },
    ]);

    await page.getByRole('link', { name: 'Insights' }).click();
    const card = page.getByRole('region', { name: 'Comments on your week' });
    await expect(card).toBeVisible();
    await expect(card.getByText('Rule-based')).toBeVisible();
    await expect(card.getByText(/You slept 6h 18m on average/)).toBeVisible();
    await expect(card.getByText(/Entertainment went over your 1h 30m cap/)).toBeVisible();
    await expect(card.getByText('AI comments are off')).toHaveCount(0);
  });

  test('shows a neutral message with no tracked days this week', async ({ page }) => {
    const user = await openSignedIn(page, '/insights/');
    await seedHabitGoals(user.uid, sampleHabitGoals(Date.now()));
    await page.reload();
    const card = page.getByRole('region', { name: 'Comments on your week' });
    await expect(card.getByText('Track a few days this week to see comments here.')).toBeVisible();
  });

  test('renders nothing before Habits & goals is completed', async ({ page }) => {
    await openSignedIn(page, '/insights/');
    await expect(page.getByRole('region', { name: 'Comments on your week' })).toHaveCount(0);
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
