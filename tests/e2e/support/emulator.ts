import { randomUUID } from 'node:crypto';
import { type Page, expect } from '@playwright/test';
import type { SdtTestHooks } from '../../../src/lib/firebase-test-hooks';
import type { Activity, Category, DayRating, HabitGoals, IsoDate } from '../../../src/lib/types';

/**
 * E2E helpers for the Auth + Firestore emulators (plan §2.5 phase 3 Tests).
 * The app runs with NEXT_PUBLIC_FIREBASE_EMULATORS=1, which exposes
 * `window.__sdtTest`; seeding and assertions talk to the Firestore emulator's
 * REST API as `owner` (bypasses the rules). Project demo-sdt only.
 */

const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-sdt/databases/(default)/documents';
const OWNER = { Authorization: 'Bearer owner' };

export interface TestUser {
  uid: string;
  name: string;
  email: string;
}

type HookWindow = Window & { __sdtTest?: SdtTestHooks };

/** Wait until the app loaded its emulator test hooks. */
export async function waitForTestHooks(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as HookWindow).__sdtTest !== undefined);
}

/**
 * Dismiss the onboarding wizard (ADR-008) that every fresh account sees right
 * after sign-in + migration. Most tests don't exercise it — `signInAs`'s
 * default `waitForHome: true` calls this for them; onboarding.spec.ts drives
 * the wizard directly instead of calling this.
 */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Skip for now' }).click();
}

/**
 * Sign the current page in as a brand-new fake Google user (unique per call)
 * and wait for Home. `page` must already show the app (e.g. after goto('/')).
 * A fresh account always sees the onboarding wizard ① first (ADR-008); pass
 * `waitForHome: false` to observe that (or something layered over it, like
 * the migration dialog) instead of skipping straight through.
 */
export async function signInAs(
  page: Page,
  { name = 'Minh Anh', waitForHome = true }: { name?: string; waitForHome?: boolean } = {}
): Promise<TestUser> {
  const sub = randomUUID();
  const email = `user-${sub.slice(0, 8)}@example.com`;
  await waitForTestHooks(page);
  const uid = await page.evaluate(
    ([s, e, n]) => (window as HookWindow).__sdtTest?.signIn(s, e, n) ?? '',
    [sub, email, name] as const
  );
  expect(uid).not.toBe('');
  if (waitForHome) {
    await skipOnboarding(page);
    await expect(
      page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })
    ).toBeVisible();
  }
  return { uid, name, email };
}

/**
 * Dismiss the install banner, open `/` signed in as a fresh user and wait for
 * Home's first Firestore snapshot (the "Today" card renders once activities
 * and categories loaded), then go to `path`.
 */
export async function openSignedIn(page: Page, path = '/', name?: string): Promise<TestUser> {
  await page.addInitScript(() => localStorage.setItem('sdt-install-dismissed', '1'));
  await page.goto('/');
  const user = await signInAs(page, { name });
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  if (path !== '/') await page.goto(path);
  return user;
}

/**
 * Like `openSignedIn`, but for tests that need a *completed* `goals/habits`
 * doc (ADR-009 slice 4 reads it): seeds it right after sign-in and reloads,
 * instead of clicking through the onboarding wizard's "Skip for now". That
 * matters because Skip fires its own fire-and-forget `saveHabitGoals` write
 * (status: 'skipped') — racing a REST seed issued afterwards would let
 * whichever write reaches the emulator last silently win.
 */
export async function openSignedInWithGoals(
  page: Page,
  goals: HabitGoals,
  path = '/'
): Promise<TestUser> {
  await page.addInitScript(() => localStorage.setItem('sdt-install-dismissed', '1'));
  await page.goto('/');
  const user = await signInAs(page, { waitForHome: false });
  await seedHabitGoals(user.uid, goals);
  await page.goto(path);
  await expect(page.getByRole('navigation', { name: 'Primary' }).first()).toBeVisible();
  return user;
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

/** Recursive — handles the nested objects/arrays in `HabitGoals` (e.g. `school.blocks`). */
function encode(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'object') return { mapValue: { fields: fields(value as object) } };
  throw new Error(`Unsupported value ${String(value)}`);
}

function fields(data: object) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, encode(v)])
  );
}

async function commit(writes: object[]) {
  const response = await fetch(`${FIRESTORE}:commit`, {
    method: 'POST',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes }),
  });
  if (!response.ok) throw new Error(`Seeding failed: ${await response.text()}`);
}

const docName = (path: string) => `projects/demo-sdt/databases/(default)/documents/${path}`;

/** Write activities straight to users/{uid}/activities on the emulator. */
export async function seedActivities(uid: string, rows: Activity[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 400) {
    await commit(
      rows.slice(i, i + 400).map((row) => ({
        update: { name: docName(`users/${uid}/activities/${row.id}`), fields: fields(row) },
      }))
    );
  }
}

/** Write day ratings straight to users/{uid}/dayRatings/{date} on the emulator. */
export async function seedDayRatings(
  uid: string,
  rows: { date: IsoDate; rating: DayRating }[]
): Promise<void> {
  for (let i = 0; i < rows.length; i += 400) {
    await commit(
      rows.slice(i, i + 400).map(({ date, rating }) => ({
        update: { name: docName(`users/${uid}/dayRatings/${date}`), fields: fields(rating) },
      }))
    );
  }
}

/** Write the `users/{uid}/goals/habits` document straight to the emulator (ADR-008 §2.3). */
export async function seedHabitGoals(uid: string, goals: HabitGoals): Promise<void> {
  await commit([{ update: { name: docName(`users/${uid}/goals/habits`), fields: fields(goals) } }]);
}

/** Plain JSON of every activity stored for `uid` on the emulator (server side). */
export async function listActivities(uid: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${FIRESTORE}/users/${uid}/activities?pageSize=1000`, {
    headers: OWNER,
  });
  const body = (await response.json()) as { documents?: { fields: Record<string, object> }[] };
  return (body.documents ?? []).map((d) => decode(d.fields));
}

export async function listCategories(uid: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${FIRESTORE}/users/${uid}/categories`, { headers: OWNER });
  const body = (await response.json()) as { documents?: { fields: Record<string, object> }[] };
  return (body.documents ?? []).map((d) => decode(d.fields));
}

/** The users/{uid} profile on the emulator, or null. */
export async function getProfile(uid: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${FIRESTORE}/users/${uid}`, { headers: OWNER });
  if (response.status === 404) return null;
  const body = (await response.json()) as { fields: Record<string, object> };
  return decode(body.fields);
}

function decode(raw: Record<string, object>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => {
      const value = v as Record<string, unknown>;
      if ('integerValue' in value) return [k, Number(value.integerValue)];
      if ('nullValue' in value) return [k, null];
      return [k, Object.values(value)[0]];
    })
  );
}

/** F3: force the next AI call(s) in this page to resolve with `text` instead of calling Gemini. */
export async function setAiReply(page: Page, text: string): Promise<void> {
  await waitForTestHooks(page);
  await page.evaluate((t) => (window as HookWindow).__sdtTest?.setAiReply(t), text);
}

/** F3: force the next AI call(s) in this page to fail (offline/quota/model error). */
export async function setAiError(page: Page): Promise<void> {
  await waitForTestHooks(page);
  await page.evaluate(() => (window as HookWindow).__sdtTest?.setAiError());
}

/** Seed the legacy Dexie database in the page (before the first sign-in). */
export async function seedDexie(
  page: Page,
  activities: Activity[],
  categories: Category[] = []
): Promise<void> {
  await waitForTestHooks(page);
  await page.evaluate(
    async ([a, c]) => {
      const dexie = (window as HookWindow).__sdtTest?.dexie;
      if (!dexie) throw new Error('No test hooks');
      await dexie.activities.bulkAdd(a);
      if (c.length > 0) await dexie.categories.bulkAdd(c);
    },
    [activities, categories] as const
  );
}

/** Names of this origin's IndexedDB databases. */
export async function indexedDbNames(page: Page): Promise<string[]> {
  return page.evaluate(async () =>
    (await indexedDB.databases()).map((d) => d.name ?? '').filter(Boolean)
  );
}
