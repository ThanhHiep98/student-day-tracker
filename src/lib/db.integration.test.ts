/**
 * Integration test: exercises the real Dexie schema (incl. the default
 * category seed) against fake-indexeddb.
 *
 * Pure helpers get their own unit tests without IndexedDB. This file only
 * proves the schema, indexes, and seed round-trip correctly.
 */
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addActivityRows,
  deleteActivity,
  getActivityRows,
  updateActivity,
} from './activity-writes';
import { buildActivity, buildUpdatedActivity } from './build-activity';
import { buildCategory } from './build-category';
import { StudentDayTrackerDB, db } from './db';
import { buildDemoActivities } from './demo-activities';
import type { Activity } from './types';
import { getActivitiesInRange } from './use-activities-range';
import { deleteDemoActivities } from './use-demo-data';

async function reset() {
  await db.activities.clear();
  // isDefault is a boolean, which IndexedDB can't index — filter instead.
  await db.categories.filter((c) => !c.isDefault).delete();
}

beforeEach(reset);
afterEach(reset);

describe('Dexie schema', () => {
  it('seeds the four default categories on first open', async () => {
    const categories = await db.categories.toArray();
    const names = categories.filter((c) => c.isDefault).map((c) => c.name);
    expect(names.sort()).toEqual(['Entertainment', 'Exercise', 'Study', 'Work']);
  });

  it('round-trips an activity', async () => {
    const activity: Activity = {
      id: 'a1',
      categoryId: 'work',
      name: 'Deep work block',
      date: '2026-09-25',
      startMinutes: 9 * 60,
      endMinutes: 10 * 60 + 30,
      createdAt: 1700000000000,
    };
    await db.activities.add(activity);
    expect(await db.activities.get('a1')).toEqual(activity);
  });

  it('resolves activities for a given day via the date index', async () => {
    await db.activities.bulkAdd([
      {
        id: 'a1',
        categoryId: 'work',
        name: 'Work',
        date: '2026-09-25',
        startMinutes: 540,
        endMinutes: 600,
        createdAt: 1,
      },
      {
        id: 'a2',
        categoryId: 'study',
        name: 'Study',
        date: '2026-09-25',
        startMinutes: 600,
        endMinutes: 660,
        createdAt: 2,
      },
      {
        id: 'a3',
        categoryId: 'work',
        name: 'Work',
        date: '2026-09-26',
        startMinutes: 540,
        endMinutes: 600,
        createdAt: 3,
      },
    ]);

    const onDate = await db.activities.where('date').equals('2026-09-25').toArray();
    expect(onDate.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
  });

  it('resolves activities for a given day + category via the composite index', async () => {
    await db.activities.bulkAdd([
      {
        id: 'a1',
        categoryId: 'work',
        name: 'Work',
        date: '2026-09-25',
        startMinutes: 540,
        endMinutes: 600,
        createdAt: 1,
      },
      {
        id: 'a2',
        categoryId: 'study',
        name: 'Study',
        date: '2026-09-25',
        startMinutes: 600,
        endMinutes: 660,
        createdAt: 2,
      },
    ]);

    const match = await db.activities
      .where('[date+categoryId]')
      .equals(['2026-09-25', 'work'])
      .toArray();
    expect(match.map((a) => a.id)).toEqual(['a1']);
  });
});

describe('Dexie write round-trips (built by the pure builders)', () => {
  it('adds, edits (put) and deletes an activity', async () => {
    const categories = await db.categories.toArray();
    const [added] = buildActivity(
      {
        name: 'Essay',
        categoryId: 'study',
        date: '2026-10-01',
        startMinutes: 600,
        endMinutes: 690,
      },
      categories,
      { id: 'a1', createdAt: 42 }
    );
    await db.activities.add(added);
    expect(await db.activities.get('a1')).toEqual(added);

    const { put, deleteIds } = buildUpdatedActivity(
      [added],
      {
        name: 'Essay draft',
        categoryId: 'work',
        date: '2026-10-01',
        startMinutes: 600,
        endMinutes: 720,
      },
      categories
    );
    expect(deleteIds).toEqual([]);
    await db.activities.bulkPut(put);
    expect(await db.activities.get('a1')).toEqual({
      ...added,
      name: 'Essay draft',
      categoryId: 'work',
      endMinutes: 720,
    });
    expect(await db.activities.count()).toBe(1);

    await db.activities.delete('a1');
    expect(await db.activities.get('a1')).toBeUndefined();
  });

  it('persists a custom category next to the defaults', async () => {
    const existing = await db.categories.toArray();
    const category = buildCategory('Volunteering', existing, { id: 'c1', createdAt: 99 });
    await db.categories.add(category);
    const all = await db.categories.orderBy('createdAt').toArray();
    expect(all.map((c) => c.name)).toEqual([
      'Work',
      'Study',
      'Exercise',
      'Entertainment',
      'Volunteering',
    ]);
  });
});

describe('getActivitiesInRange', () => {
  it('includes both range bounds and excludes dates outside them', async () => {
    const row = (id: string, date: string): Activity => ({
      id,
      categoryId: 'work',
      name: id,
      date,
      startMinutes: 0,
      endMinutes: 60,
      createdAt: 0,
    });
    await db.activities.bulkAdd([
      row('before', '2026-09-20'),
      row('start', '2026-09-21'),
      row('mid', '2026-09-25'),
      row('end', '2026-10-01'),
      row('after', '2026-10-02'),
    ]);
    const result = await getActivitiesInRange('2026-09-21', '2026-10-01');
    expect(result.map((a) => a.id).sort()).toEqual(['end', 'mid', 'start']);
  });
});

describe('deleteDemoActivities', () => {
  it('removes only demo- rows (and legacy ids), leaving real rows intact', async () => {
    const demo = buildDemoActivities('2026-10-01', 1_000);
    const real: Activity = {
      id: 'real-1',
      categoryId: 'work',
      name: 'My own work',
      date: '2026-10-01',
      startMinutes: 540,
      endMinutes: 600,
      createdAt: 2_000,
    };
    const legacy: Activity = { ...real, id: 'legacy-uuid', name: 'Old demo row' };
    await db.activities.bulkAdd([...demo, real, legacy]);

    await deleteDemoActivities(['legacy-uuid']);

    expect(await db.activities.toArray()).toEqual([real]);
  });
});

describe('cross-midnight spans', () => {
  const sleep = {
    name: 'Sleep',
    categoryId: 'study',
    date: '2026-09-30',
    startMinutes: 21 * 60,
    endMinutes: 60,
  };

  async function addSleep(id = 's1') {
    const categories = await db.categories.toArray();
    const rows = buildActivity(sleep, categories, { id, createdAt: 7 });
    await addActivityRows(rows);
    return { rows, categories };
  }

  it('stores 21:00 -> 01:00 as two rows on two days, found by the spanId index', async () => {
    await addSleep();
    expect(await db.activities.where('date').equals('2026-09-30').toArray()).toMatchObject([
      { id: 's1', spanId: 's1', startMinutes: 1260, endMinutes: 1440 },
    ]);
    expect(await db.activities.where('date').equals('2026-10-01').toArray()).toMatchObject([
      { id: 's1-next', spanId: 's1', startMinutes: 0, endMinutes: 60 },
    ]);
    const bySpan = await db.activities.where('spanId').equals('s1').toArray();
    expect(bySpan.map((a) => a.id).sort()).toEqual(['s1', 's1-next']);
  });

  it('getActivityRows loads the whole span from either row, or a single row', async () => {
    const { rows } = await addSleep();
    const { spanId: _unused, ...headFields } = rows[0];
    const single: Activity = { ...headFields, id: 'one', date: '2026-09-29' };
    await db.activities.add(single);

    const fromTail = await getActivityRows(rows[1]);
    expect(fromTail.map((a) => a.id).sort()).toEqual(['s1', 's1-next']);
    const fromHead = await getActivityRows(rows[0]);
    expect(fromHead.map((a) => a.id).sort()).toEqual(['s1', 's1-next']);
    expect(await getActivityRows(single)).toEqual([single]);
  });

  it('editing a span into a same-day activity leaves no orphan tail', async () => {
    const { rows, categories } = await addSleep();
    await updateActivity(rows[1], { ...sleep, endMinutes: 23 * 60 }, categories);
    expect(await db.activities.toArray()).toEqual([
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
  });

  it('editing a same-day activity into a span adds the tail row', async () => {
    const categories = await db.categories.toArray();
    const [row] = buildActivity({ ...sleep, endMinutes: 1380 }, categories, {
      id: 'x',
      createdAt: 1,
    });
    await addActivityRows([row]);
    await updateActivity(row, { ...sleep, endMinutes: 90 }, categories);
    const all = await db.activities.orderBy('date').toArray();
    expect(all).toMatchObject([
      { id: 'x', spanId: 'x', date: '2026-09-30', startMinutes: 1260, endMinutes: 1440 },
      { id: 'x-next', spanId: 'x', date: '2026-10-01', startMinutes: 0, endMinutes: 90 },
    ]);
  });

  it('an invalid edit throws and leaves both rows untouched', async () => {
    const { rows, categories } = await addSleep();
    await expect(
      updateActivity(rows[0], { ...sleep, startMinutes: 60, endMinutes: 60 }, categories)
    ).rejects.toThrow("Start and end time can't be the same.");
    expect(await db.activities.count()).toBe(2);
  });

  it('deleting either row removes the whole span', async () => {
    const { rows } = await addSleep();
    const { rows: other } = await addSleep('s2');
    await deleteActivity(rows[1]);
    expect((await db.activities.toArray()).map((a) => a.id).sort()).toEqual(['s2', 's2-next']);
    await deleteActivity(other[0]);
    expect(await db.activities.count()).toBe(0);
  });

  it('demo "Clear & start fresh" also removes demo-*-next tail rows', async () => {
    const categories = await db.categories.toArray();
    await addActivityRows(buildActivity(sleep, categories, { id: 'demo-sleep', createdAt: 1 }));
    expect(await db.activities.count()).toBe(2);
    await deleteDemoActivities();
    expect(await db.activities.count()).toBe(0);
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
    const row: Activity = {
      id: 'old-1',
      categoryId: 'work',
      name: 'Old row',
      date: '2026-09-01',
      startMinutes: 540,
      endMinutes: 600,
      createdAt: 1,
    };
    await legacy.table('activities').add(row);
    legacy.close();

    const upgraded = new StudentDayTrackerDB(name);
    await upgraded.open();
    expect(upgraded.verno).toBe(2);
    expect(await upgraded.activities.toArray()).toEqual([row]);
    expect(await upgraded.activities.where('spanId').equals('anything').count()).toBe(0);
    upgraded.close();
    await Dexie.delete(name);
  });
});
