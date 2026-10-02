import { type Page, type Route, expect, test } from '@playwright/test';
import type { SdtTestHooks } from '../../src/lib/firebase-test-hooks';
import type { Activity, Category } from '../../src/lib/types';
import {
  getProfile,
  indexedDbNames,
  listActivities,
  listCategories,
  openSignedIn,
  seedDexie,
  signInAs,
  waitForTestHooks,
} from './support/emulator';

/**
 * F2 — Tạo account + đăng nhập (plans/2026-10-01-v2-roadmap-cross-midnight.html
 * §2.3 / §2.7) against the Auth + Firestore emulators. Screens ①–⑧ refer to
 * the approved mockups in §1.2.
 */

type HookWindow = Window & { __sdtTest?: SdtTestHooks };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sdt-install-dismissed', '1'));
});

const welcome = (page: Page) => page.getByRole('heading', { name: 'Welcome', exact: true });
const greeting = (page: Page) =>
  page.getByRole('heading', { name: /good (morning|afternoon|evening)/i });
const timeline = (page: Page) => page.getByRole('region', { name: "Today's timeline" });

async function addActivity(page: Page, name: string, start: string, end: string) {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What did you do?').fill(name);
  await dialog.getByLabel('Start time').fill(start);
  await dialog.getByLabel('End time').fill(end);
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog).toBeHidden();
}

async function openAccountMenu(page: Page, name = 'Minh Anh') {
  await page.getByRole('button', { name: new RegExp(name) }).click();
  const menu = page.getByRole('dialog', { name: 'Account' });
  await expect(menu).toBeVisible();
  return menu;
}

test.describe('signed out', () => {
  for (const path of ['/', '/history/', '/insights/']) {
    test(`${path} shows only the sign-in screen ①`, async ({ page }) => {
      await page.goto(path);
      await expect(welcome(page)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled();
      await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'privacy notice' })).toHaveAttribute(
        'href',
        '/privacy/'
      );
    });
  }

  test('/privacy/ is readable without signing in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'privacy notice' }).click();
    await expect(page).toHaveURL('/privacy/');
    await expect(page.getByRole('heading', { name: 'Thông báo về quyền riêng tư' })).toBeVisible();
    await expect(page.getByText(/asia-southeast1 \(Singapore\)/)).toBeVisible();
    await expect(welcome(page)).toHaveCount(0);
  });

  test('offline ③: amber notice and a disabled button', async ({ page, context }) => {
    await page.goto('/');
    await expect(welcome(page)).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByText("You're offline.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeDisabled();
    await context.setOffline(false);
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled();
  });
});

test.describe('real Google button', () => {
  // The Auth emulator's popup pages load scripts from apis.google.com and
  // unpkg.com; when one of those external requests stalls, the SDK waits on
  // its auth iframe and the sign-in never settles. Not app code — retry.
  test.describe.configure({ retries: 2 });

  test('signs in through the popup and creates users/{uid} ("Tạo User")', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await waitForTestHooks(page);
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Sign in with Google' }).click();
    const popup = await popupPromise;
    // Auth emulator's fake Google page: "Add new account" → "Auto-generate user
    // information" → "Sign in with Google.com". Under load the first click can
    // land before the popup's script is wired up.
    await expect(async () => {
      await popup.getByText('Add new account').click({ timeout: 2_000 });
      await expect(popup.locator('#autogen-button')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await popup.locator('#autogen-button').click();
    await expect(popup.getByLabel('Email')).toHaveValue(/@/);
    const closed = popup.waitForEvent('close');
    await popup.locator('#sign-in').click();
    await closed;

    await expect(greeting(page)).toBeVisible({ timeout: 20_000 });
    const uid = await page.evaluate(() => (window as HookWindow).__sdtTest?.currentUid() ?? null);
    expect(uid).not.toBeNull();

    await expect.poll(() => getProfile(uid as string)).not.toBeNull();
    const profile = (await getProfile(uid as string)) as Record<string, unknown>;
    expect(Object.keys(profile).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'photoURL',
      'privacyAcceptedAt',
    ]);
    expect(profile.privacyAcceptedAt).toBe(profile.createdAt);
    expect(typeof profile.email).toBe('string');
    // No default category docs are written at sign-up.
    expect(await listCategories(uid as string)).toEqual([]);
  });
});

test('a new account starts empty: no demo banner, no demo rows', async ({ page }) => {
  const user = await openSignedIn(page);
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
  await expect(page.getByText('Demo data')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clear & start fresh' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { name: 'Nothing tracked this week yet' })).toBeVisible();
  await expect(page.getByText('Demo data')).toHaveCount(0);
  expect(await listActivities(user.uid)).toEqual([]);
});

test('Home greets with the given name from the Google display name (⑤)', async ({ page }) => {
  await openSignedIn(page, '/', 'Nguyễn Minh Anh');
  await expect(greeting(page)).toHaveText(/^Good (morning|afternoon|evening), Anh$/);
});

test('a persisted session opens straight into the app, never flashing ①', async ({ page }) => {
  await openSignedIn(page);
  await page.addInitScript(() => {
    const w = window as Window & { __sawWelcome?: boolean };
    w.__sawWelcome = false;
    new MutationObserver(() => {
      for (const h of document.querySelectorAll('h1')) {
        if (h.textContent === 'Welcome') w.__sawWelcome = true;
      }
    }).observe(document, { subtree: true, childList: true });
  });
  await page.reload();
  await expect(greeting(page)).toBeVisible();
  await page.goto('/history/');
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { __sawWelcome?: boolean }).__sawWelcome)
  ).toBe(false);
});

test('account menu ⑥ shows name, email and sync status; sign out returns to ① and clears the cache', async ({
  page,
}) => {
  const first = await openSignedIn(page);
  await addActivity(page, 'First user secret', '07:00', '08:00');
  await expect.poll(async () => (await listActivities(first.uid)).length).toBe(1);

  const menu = await openAccountMenu(page);
  await expect(menu.getByText('Minh Anh')).toBeVisible();
  await expect(menu.getByText(first.email)).toBeVisible();
  await expect(menu.getByText('Synced · works offline')).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute(
    'href',
    '/privacy/'
  );
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: /Minh Anh/ })).toBeFocused();

  // Sign out ends with a reload to a clean app (after the cache is deleted).
  const reloaded = page.waitForEvent('load');
  await (await openAccountMenu(page)).getByRole('button', { name: 'Sign out' }).click();
  await reloaded;
  await expect(welcome(page)).toBeVisible();
  await expect
    .poll(async () => (await indexedDbNames(page)).filter((n) => n.startsWith('firestore/')))
    .toEqual([]);

  // Another account on the same device sees none of the first user's data.
  await signInAs(page, { name: 'Bảo Ngọc' });
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
  await expect(page.getByText('First user secret')).toHaveCount(0);
});

test('offline: add works and the form closes at once; it syncs when back online', async ({
  page,
  context,
}) => {
  const user = await openSignedIn(page);
  await context.setOffline(true);

  await addActivity(page, 'Offline essay', '19:00', '20:15');
  await expect(timeline(page).getByText('Offline essay')).toBeVisible();
  const menu = await openAccountMenu(page);
  await expect(menu.getByText(/^Offline ·/)).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await listActivities(user.uid)).toEqual([]);

  await context.setOffline(false);
  await expect
    .poll(async () => (await listActivities(user.uid)).map((a) => a.name), { timeout: 10_000 })
    .toEqual(['Offline essay']);
  await expect((await openAccountMenu(page)).getByText('Synced · works offline')).toBeVisible();
});

test('offline sign out with unsynced changes asks first (⑥)', async ({ page, context }) => {
  await openSignedIn(page);
  await context.setOffline(true);
  await addActivity(page, 'Unsynced note', '10:00', '10:30');

  await (await openAccountMenu(page)).getByRole('button', { name: 'Sign out' }).click();
  const confirm = page.getByRole('dialog', { name: 'Sign out while offline?' });
  await expect(confirm).toBeVisible();
  await expect(confirm.getByText(/haven't synced and will be lost/)).toBeVisible();
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(timeline(page).getByText('Unsynced note')).toBeVisible();
  await context.setOffline(false);
});

test.describe('mobile ⑦ ⑧', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the avatar replaces the theme toggle and opens the account sheet', async ({ page }) => {
    const user = await openSignedIn(page);
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeHidden();
    await page.getByRole('button', { name: 'Account' }).click();

    const sheet = page.getByRole('dialog', { name: 'Minh Anh' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(user.email)).toBeVisible();
    await expect(sheet.getByText('Synced · works offline')).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Privacy notice' })).toBeVisible();

    const darkMode = sheet.getByRole('switch', { name: 'Dark mode' });
    await expect(darkMode).toHaveAttribute('aria-checked', 'false');
    await darkMode.click();
    await expect(darkMode).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await sheet.getByRole('button', { name: 'Sign out' }).click();
    await expect(welcome(page)).toBeVisible();
  });
});

/** Local (pre-F2) rows dated relative to the browser's today. */
async function legacyRows(page: Page) {
  const { today, yesterday } = await page.evaluate(() => {
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const now = new Date();
    return {
      today: iso(now),
      yesterday: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
    };
  });
  const base = { createdAt: 1, categoryId: 'study' };
  const activities: Activity[] = [
    {
      ...base,
      id: 'local-1',
      name: 'Old revision',
      date: today,
      startMinutes: 480,
      endMinutes: 540,
    },
    {
      ...base,
      id: 'local-2',
      name: 'Old piano',
      categoryId: 'c-piano',
      date: today,
      startMinutes: 600,
      endMinutes: 630,
    },
    {
      ...base,
      id: 'local-sleep',
      spanId: 'local-sleep',
      name: 'Old sleep',
      date: yesterday,
      startMinutes: 1320,
      endMinutes: 1440,
    },
    {
      ...base,
      id: 'local-sleep-next',
      spanId: 'local-sleep',
      name: 'Old sleep',
      date: today,
      startMinutes: 0,
      endMinutes: 60,
    },
    { ...base, id: 'demo-1', name: 'Demo gym', date: today, startMinutes: 900, endMinutes: 945 },
  ];
  const categories: Category[] = [
    { id: 'c-piano', name: 'Piano', color: '#0ea5e9', icon: '🏷️', isDefault: false, createdAt: 9 },
  ];
  return { activities, categories };
}

test('first sign-in on a device with local data moves it into the account with ④, once', async ({
  page,
}) => {
  await page.goto('/');
  const { activities, categories } = await legacyRows(page);
  await seedDexie(page, activities, categories);

  // Hold Firestore writes until released, so the progress dialog is observable.
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/google.firestore.v1.Firestore/Write/**', async (route: Route) => {
    await released;
    await route.continue().catch(() => undefined);
  });

  const user = await signInAs(page);
  const dialog = page.getByRole('dialog', { name: 'Moving your activities to your account' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/We found 4 activities and 1 custom category/)).toBeVisible();
  await expect(dialog.getByRole('progressbar')).toBeVisible();

  release();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  await expect(timeline(page).getByText('Old revision')).toBeVisible();
  await expect(timeline(page).getByText('Old piano')).toBeVisible();
  await expect(timeline(page).getByText(/from previous day/)).toBeVisible();
  await expect(timeline(page).getByText('Demo gym')).toHaveCount(0);

  const stored = await listActivities(user.uid);
  expect(stored.map((a) => a.id).sort()).toEqual([
    'local-1',
    'local-2',
    'local-sleep',
    'local-sleep-next',
  ]);
  expect((await listCategories(user.uid)).map((c) => c.name)).toEqual(['Piano']);
  expect((await getProfile(user.uid))?.migratedFromDexieAt).toEqual(expect.any(Number));

  // Runs once: a reload shows no dialog and writes nothing new.
  await page.reload();
  await expect(greeting(page)).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(await listActivities(user.uid)).toHaveLength(4);
});
