/**
 * Integration test: the legacy Dexie schema (incl. the default-category seed)
 * against fake-indexeddb.
 *
 * Since F2 Dexie is frozen at version(2) and only read once, as the source of
 * the first-sign-in migration (migrate-local-data.ts). This file proves that
 * source still opens — schema, seed, indexes, v1 → v2 upgrade. The write path
 * now targets Firestore and is tested on the emulator
 * (tests/emulator/activity-writes.test.ts).
 */
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StudentDayTrackerDB, db } from './db';
import type { Activity } from './types';

async function reset() {
  await db.activities.clear();
  // isDefault is a boolean, which IndexedDB can't index — filter instead.
  await db.categories.filter((c) => !c.isDefault).delete();
}

beforeEach(reset);
afterEach(reset);

const row = (id: string, date: string, categoryId = 'work'): Activity => ({
  id,
  categoryId,
  name: id,
  date,
  startMinutes: 540,
  endMinutes: 600,
  createdAt: 1,
});

describe('Dexie schema (migration source)', () => {
  it('seeds the four default categories on first open', async () => {
    const categories = await db.categories.toArray();
    const names = categories.filter((c) => c.isDefault).map((c) => c.name);
    expect(names.sort()).toEqual(['Entertainment', 'Exercise', 'Study', 'Work']);
  });

  it('round-trips an activity, including a span row', async () => {
    const activity: Activity = { ...row('a1', '2026-09-25'), spanId: 'a1' };
    await db.activities.add(activity);
    expect(await db.activities.get('a1')).toEqual(activity);
  });

  it('resolves activities by date, by date + category, and by spanId', async () => {
    await db.activities.bulkAdd([
      { ...row('s1', '2026-09-25'), spanId: 's1' },
      { ...row('s1-next', '2026-09-26'), spanId: 's1' },
      row('a2', '2026-09-25', 'study'),
    ]);
    const onDate = await db.activities.where('date').equals('2026-09-25').toArray();
    expect(onDate.map((a) => a.id).sort()).toEqual(['a2', 's1']);
    const match = await db.activities
      .where('[date+categoryId]')
      .equals(['2026-09-25', 'study'])
      .toArray();
    expect(match.map((a) => a.id)).toEqual(['a2']);
    const span = await db.activities.where('spanId').equals('s1').toArray();
    expect(span.map((a) => a.id).sort()).toEqual(['s1', 's1-next']);
  });
});

describe('schema upgrade', () => {
  it('opens a v1 database as v2 with its rows intact and the spanId index usable', async () => {
    const name = 'sdt-upgrade-test';
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      categories: 'id, isDefault, createdAt',
      activities: 'id, date, categoryId, [date+categoryId]',
    });
    const old = row('old-1', '2026-09-01');
    await legacy.table('activities').add(old);
    legacy.close();

    const upgraded = new StudentDayTrackerDB(name);
    await upgraded.open();
    expect(upgraded.verno).toBe(2);
    expect(await upgraded.activities.toArray()).toEqual([old]);
    expect(await upgraded.activities.where('spanId').equals('anything').count()).toBe(0);
    upgraded.close();
    await Dexie.delete(name);
  });
});
