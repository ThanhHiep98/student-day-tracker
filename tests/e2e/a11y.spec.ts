import AxeBuilder from '@axe-core/playwright';
import { type Page, type Route, expect, test } from '@playwright/test';
import type { Activity } from '../../src/lib/types';
import {
  openSignedIn,
  seedActivities,
  seedDayRatings,
  seedDexie,
  signInAs,
} from './support/emulator';
import { buildSampleWeek } from './support/sample-week';

const welcome = (page: Page) => page.getByRole('heading', { name: /Let's set up your day/ });

/** Zero axe-core violations is a CI-equivalent gate (CLAUDE.md). */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sdt-install-dismissed', '1'));
});

test.describe('signed out', () => {
  test('sign-in screen ① has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('offline sign-in screen ③ has no accessibility violations', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByText("You're offline.")).toBeVisible();
    await expectNoViolations(page);
    await context.setOffline(false);
  });

  test('/privacy/ has no accessibility violations', async ({ page }) => {
    await page.goto('/privacy/');
    await expect(page.getByRole('heading', { name: 'Thông báo về quyền riêng tư' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('mobile sign-in ② has no accessibility violations', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('signed in', () => {
  for (const [path, heading] of [
    ['/', /good (morning|afternoon|evening)/i],
    ['/history/', 'History'],
    ['/insights/', 'Insights'],
  ] as const) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await openSignedIn(page, path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
      await expectNoViolations(page);
    });
  }

  test('account popover ⑥ has no accessibility violations', async ({ page }) => {
    await openSignedIn(page);
    await page.getByRole('button', { name: /Minh Anh/ }).click();
    await expect(page.getByRole('dialog', { name: 'Account' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('mobile Home ⑦ and account sheet ⑧ have no accessibility violations', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSignedIn(page);
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Account' }).click();
    await expect(page.getByRole('dialog', { name: 'Minh Anh' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('Home has no accessibility violations with the Add Activity dialog open', async ({
    page,
  }) => {
    await openSignedIn(page);
    await page.getByRole('button', { name: '+ Add Activity' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoViolations(page);
  });

  test('Home has no accessibility violations with an inline validation error showing', async ({
    page,
  }) => {
    await openSignedIn(page);
    await page.getByRole('button', { name: '+ Add Activity' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Save activity' }).click();
    await expect(dialog.getByText('Name is required.')).toBeVisible();
    await expectNoViolations(page);
  });

  test('Home has no accessibility violations with a cross-midnight activity', async ({ page }) => {
    await openSignedIn(page);
    await page.getByRole('button', { name: '+ Add Activity' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('What did you do?').fill('Sleep');
    await dialog.getByLabel('Start time').fill('23:00');
    await dialog.getByLabel('End time').fill('01:00');
    await expect(dialog.getByText('2h · ends next day')).toBeVisible();
    await expectNoViolations(page);

    await dialog.getByRole('button', { name: 'Save activity' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/continues next day/)).toBeVisible();
    await expectNoViolations(page);
  });

  test('/insights/ has no accessibility violations with a week of data', async ({ page }) => {
    const user = await openSignedIn(page);
    const today = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await seedActivities(user.uid, buildSampleWeek(today, Date.now()));
    await page.getByRole('link', { name: 'Insights' }).click();
    await expect(
      page.getByRole('region', { name: 'Activity analytics' }).getByRole('button', { name: 'Gym' })
    ).toBeVisible();
    await expectNoViolations(page);
  });

  test('/insights/ has no accessibility violations in its empty state', async ({ page }) => {
    await openSignedIn(page, '/insights/');
    await expect(
      page.getByRole('heading', { name: 'Nothing tracked this week yet' })
    ).toBeVisible();
    await expectNoViolations(page);
  });

  test('Home has no accessibility violations once today is rated with a note (ADR-009 ①③)', async ({
    page,
  }) => {
    await openSignedIn(page);
    const card = page.getByRole('region', { name: 'How was your day?' });
    await card.getByRole('button', { name: '4 of 5' }).click();
    await card.getByLabel('Optional note').fill('Kiểm tra Toán ổn, nhưng thức khuya quá.');
    await expectNoViolations(page);
  });

  test('History has no accessibility violations with a rated day', async ({ page }) => {
    const user = await openSignedIn(page);
    const today = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await seedDayRatings(user.uid, [{ date: today, rating: { score: 3, updatedAt: Date.now() } }]);
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByRole('region', { name: 'How was your day?' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('/insights/ has no accessibility violations with "How your days felt" rated (ADR-009 ⑤)', async ({
    page,
  }) => {
    const user = await openSignedIn(page);
    const today = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await seedDayRatings(user.uid, [{ date: today, rating: { score: 5, updatedAt: Date.now() } }]);
    await page.getByRole('link', { name: 'Insights' }).click();
    await expect(page.getByRole('region', { name: 'How your days felt' })).toBeVisible();
    await expectNoViolations(page);
  });
});

test('migration dialog ④ has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const row: Activity = {
    id: 'local-1',
    categoryId: 'study',
    name: 'Old revision',
    date: '2026-09-01',
    startMinutes: 480,
    endMinutes: 540,
    createdAt: 1,
  };
  await seedDexie(page, [row]);
  // Hold Firestore writes so the dialog stays open while axe runs.
  await page.route('**/google.firestore.v1.Firestore/Write/**', (_route: Route) => {});
  // The migration dialog can land over either Home or the onboarding wizard
  // (ADR-008 §2.4) — observe it directly rather than skipping onboarding first.
  await signInAs(page, { waitForHome: false });
  await expect(
    page.getByRole('dialog', { name: 'Moving your activities to your account' })
  ).toBeVisible();
  await expectNoViolations(page);
});

test.describe('onboarding (ADR-008)', () => {
  test('welcome ① has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await signInAs(page, { waitForHome: false });
    await expect(welcome(page)).toBeVisible();
    await expectNoViolations(page);
  });

  test('a question step has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await signInAs(page, { waitForHome: false });
    await expect(welcome(page)).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(
      page.getByRole('heading', { name: 'How much sleep do you want each night?' })
    ).toBeVisible();
    await expectNoViolations(page);
  });

  test('review ⑦ has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await signInAs(page, { waitForHome: false });
    await page.getByRole('button', { name: 'Start' }).click();
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByRole('heading', { name: 'Your ideal school day' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('Home banner ⑧ has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await signInAs(page, { waitForHome: false });
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await expect(page.getByText('Finish setting up your day')).toBeVisible();
    await expectNoViolations(page);
  });

  test('Habits & goals ⑨ has no accessibility violations', async ({ page }) => {
    await openSignedIn(page, '/goals/');
    await expect(page.getByRole('heading', { name: 'Habits & goals' })).toBeVisible();
    await expectNoViolations(page);
  });
});
