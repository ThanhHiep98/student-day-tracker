import {
  addActivityRows,
  deleteActivity,
  getActivityRows,
  updateActivity,
} from '@/lib/activity-writes';
import { buildActivity } from '@/lib/build-activity';
import { buildCategory } from '@/lib/build-category';
import { addCategory } from '@/lib/category-writes';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';
import { activitiesCol, categoriesCol, userDoc } from '@/lib/firestore-paths';
import type { Activity, Category } from '@/lib/types';
import { getActivitiesInRange } from '@/lib/use-activities-range';
import { ensureUserProfile } from '@/lib/user-profile';
/**
 * Integration: the real modular SDK against the Auth + Firestore emulators
 * (plan §2.6). Proves the write helpers store today's ids/fields at the §2.4
 * paths, that a span is always written as one batch, and that two devices on
 * the same account see each other's writes.
 */
import {
  getDoc,
  getDocsFromServer,
  onSnapshot,
  query,
  waitForPendingWrites,
  where,
} from 'firebase/firestore';
import { afterEach, describe, expect, it } from 'vitest';
import { type Device, signInDevice, waitFor } from './support';

const categories: Category[] = [...DEFAULT_CATEGORIES];
const sleep = {
  name: 'Sleep',
  categoryId: 'study',
  date: '2026-09-30',
  startMinutes: 21 * 60,
  endMinutes: 60,
};

const devices: Device[] = [];
async function device(sub?: string) {
  const d = await signInDevice(sub);
  devices.push(d);
  return d;
}

afterEach(async () => {
  await Promise.all(devices.splice(0).map((d) => d.close()));
});

async function serverRows(d: Device): Promise<Activity[]> {
  const snapshot = await getDocsFromServer(activitiesCol(d.scope));
  return snapshot.docs.map((doc) => doc.data()).sort((a, b) => a.id.localeCompare(b.id));
}

describe('activity writes', () => {
  it('stores a cross-midnight activity as two docs sharing spanId, at users/{uid}/activities', async () => {
    const d = await device();
    addActivityRows(d.scope, buildActivity(sleep, categories, { id: 's1', createdAt: 7 }));
    await waitForPendingWrites(d.scope.db);

    expect(await serverRows(d)).toEqual([
      {
        id: 's1',
        spanId: 's1',
        name: 'Sleep',
        categoryId: 'study',
        date: '2026-09-30',
        startMinutes: 1260,
        endMinutes: 1440,
        createdAt: 7,
      },
      {
        id: 's1-next',
        spanId: 's1',
        name: 'Sleep',
        categoryId: 'study',
        date: '2026-10-01',
        startMinutes: 0,
        endMinutes: 60,
        createdAt: 7,
      },
    ]);
  });

  it('stores a same-day activity without a spanId field', async () => {
    const d = await device();
    addActivityRows(
      d.scope,
      buildActivity({ ...sleep, endMinutes: 1380 }, categories, { id: 'one', createdAt: 1 })
    );
    await waitForPendingWrites(d.scope.db);
    const [row] = await serverRows(d);
    expect(row).not.toHaveProperty('spanId');
    expect(row).toMatchObject({ id: 'one', startMinutes: 1260, endMinutes: 1380 });
  });

  it('getActivityRows loads the whole span from either row', async () => {
    const d = await device();
    const rows = buildActivity(sleep, categories, { id: 's1', createdAt: 7 });
    addActivityRows(d.scope, rows);
    await waitForPendingWrites(d.scope.db);
    const ids = async (row: Activity) =>
      (await getActivityRows(d.scope, row)).map((r) => r.id).sort();
    expect(await ids(rows[0])).toEqual(['s1', 's1-next']);
    expect(await ids(rows[1])).toEqual(['s1', 's1-next']);
  });

  it('edits a span into a same-day activity (tail removed) and back across dates', async () => {
    const d = await device();
    const rows = buildActivity(sleep, categories, { id: 's1', createdAt: 7 });
    addActivityRows(d.scope, rows);

    await updateActivity(d.scope, rows[1], { ...sleep, endMinutes: 23 * 60 }, categories);
    await waitForPendingWrites(d.scope.db);
    expect(await serverRows(d)).toEqual([
      {
        id: 's1',
        name: 'Sleep',
        categoryId: 'study',
        date: '2026-09-30',
        startMinutes: 1260,
        endMinutes: 1380,
        createdAt: 7,
      },
    ]);

    await updateActivity(
      d.scope,
      { id: 's1' },
      { ...sleep, date: '2026-12-31', startMinutes: 22 * 60, endMinutes: 90 },
      categories
    );
    await waitForPendingWrites(d.scope.db);
    expect(await serverRows(d)).toMatchObject([
      { id: 's1', spanId: 's1', date: '2026-12-31', startMinutes: 1320, endMinutes: 1440 },
      { id: 's1-next', spanId: 's1', date: '2027-01-01', startMinutes: 0, endMinutes: 90 },
    ]);
  });

  it('an invalid edit throws synchronously from the builder and writes nothing', async () => {
    const d = await device();
    const rows = buildActivity(sleep, categories, { id: 's1', createdAt: 7 });
    addActivityRows(d.scope, rows);
    await waitForPendingWrites(d.scope.db);
    await expect(
      updateActivity(d.scope, rows[0], { ...sleep, startMinutes: 60, endMinutes: 60 }, categories)
    ).rejects.toThrow("Start and end time can't be the same.");
    expect(await serverRows(d)).toHaveLength(2);
  });

  it('deleting either row removes the whole span, without touching other activities', async () => {
    const d = await device();
    const first = buildActivity(sleep, categories, { id: 's1', createdAt: 1 });
    const second = buildActivity(sleep, categories, { id: 's2', createdAt: 2 });
    addActivityRows(d.scope, [...first, ...second]);
    deleteActivity(d.scope, first[1]);
    await waitForPendingWrites(d.scope.db);
    expect((await serverRows(d)).map((r) => r.id)).toEqual(['s2', 's2-next']);
    deleteActivity(d.scope, second[0]);
    await waitForPendingWrites(d.scope.db);
    expect(await serverRows(d)).toEqual([]);
  });

  it('getActivitiesInRange includes both bounds and nothing outside them', async () => {
    const d = await device();
    const row = (id: string, date: string): Activity => ({
      id,
      categoryId: 'work',
      name: id,
      date,
      startMinutes: 0,
      endMinutes: 60,
      createdAt: 0,
    });
    addActivityRows(d.scope, [
      row('before', '2026-09-20'),
      row('start', '2026-09-21'),
      row('mid', '2026-09-25'),
      row('end', '2026-10-01'),
      row('after', '2026-10-02'),
    ]);
    await waitForPendingWrites(d.scope.db);
    const result = await getActivitiesInRange(d.scope, '2026-09-21', '2026-10-01');
    expect(result.map((a) => a.id).sort()).toEqual(['end', 'mid', 'start']);
  });

  it('a span add/edit/delete is one batch: the cache never holds half a span', async () => {
    // A writeBatch is applied to the local cache as a single mutation, so a
    // listener on the writing device sees 0 → 2 → 0 rows, never 1. (The
    // emulator's listen stream to *other* devices doesn't promise consistent
    // snapshots, so this is asserted on the writer.)
    const d = await device();
    const counts: number[] = [];
    const unsubscribe = onSnapshot(
      query(activitiesCol(d.scope), where('spanId', '==', 's1')),
      (snapshot) => counts.push(snapshot.size)
    );
    await waitFor(() => counts.length > 0);
    const rows = buildActivity(sleep, categories, { id: 's1', createdAt: 7 });
    addActivityRows(d.scope, rows);
    await updateActivity(d.scope, rows[1], { ...sleep, startMinutes: 20 * 60 }, categories);
    deleteActivity(d.scope, rows[0]);
    await waitForPendingWrites(d.scope.db);
    await waitFor(() => counts.at(-1) === 0);
    unsubscribe();
    expect(counts).toContain(2);
    expect(counts).not.toContain(1);
  });
});

describe('two devices, same account', () => {
  it('a write on one device reaches the other through onSnapshot', async () => {
    const sub = `multi-${Date.now()}`;
    const phone = await device(sub);
    const laptop = await device(sub);

    let seen: string[] = [];
    const unsubscribe = onSnapshot(activitiesCol(laptop.scope), (snapshot) => {
      seen = snapshot.docs.map((doc) => doc.id);
    });
    addActivityRows(
      phone.scope,
      buildActivity({ ...sleep, endMinutes: 1380 }, categories, { id: 'from-phone', createdAt: 1 })
    );
    await waitFor(() => seen.includes('from-phone'));
    unsubscribe();
  });
});

describe('categories and profile', () => {
  it('stores only custom categories, with today fields', async () => {
    const d = await device();
    const category = buildCategory('Volunteering', categories, { id: 'c1', createdAt: 99 });
    addCategory(d.scope, category);
    await waitForPendingWrites(d.scope.db);
    const snapshot = await getDocsFromServer(categoriesCol(d.scope));
    expect(snapshot.docs.map((doc) => doc.data())).toEqual([category]);
  });

  it('ensureUserProfile creates users/{uid} once with exactly the profile fields', async () => {
    const d = await device();
    const user = { displayName: 'Minh Anh', email: 'minhanh@example.com', photoURL: null };
    expect(await ensureUserProfile(d.scope, user, 1_000)).toBe('created');
    await waitForPendingWrites(d.scope.db);
    expect(await ensureUserProfile(d.scope, user, 2_000)).toBe('exists');

    const profile = await getDoc(userDoc(d.scope));
    expect(profile.data()).toEqual({
      displayName: 'Minh Anh',
      email: 'minhanh@example.com',
      photoURL: null,
      createdAt: 1_000,
      privacyAcceptedAt: 1_000,
    });
    // No default category docs are written at sign-up.
    expect((await getDocsFromServer(categoriesCol(d.scope))).empty).toBe(true);
  });
});
