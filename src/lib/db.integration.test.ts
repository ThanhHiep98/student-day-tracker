/**
 * Integration test: exercises the real Dexie schema (incl. the default
 * category seed) against fake-indexeddb.
 *
 * Pure helpers get their own unit tests without IndexedDB. This file only
 * proves the schema, indexes, and seed round-trip correctly.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildActivity, buildUpdatedActivity } from './build-activity';
import { buildCategory } from './build-category';
import { db } from './db';
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
    const added = buildActivity(
      { name: 'Essay', categoryId: 'study', startMinutes: 600, endMinutes: 690 },
      categories,
      { id: 'a1', createdAt: 42, date: '2026-10-01' }
    );
    await db.activities.add(added);
    expect(await db.activities.get('a1')).toEqual(added);

    const edited = buildUpdatedActivity(
      added,
      { name: 'Essay draft', categoryId: 'work', startMinutes: 600, endMinutes: 720 },
      categories
    );
    await db.activities.put(edited);
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
