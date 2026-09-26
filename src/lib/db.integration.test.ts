/**
 * Integration test: exercises the real Dexie schema (incl. the default
 * category seed) against fake-indexeddb.
 *
 * Pure helpers get their own unit tests without IndexedDB. This file only
 * proves the schema, indexes, and seed round-trip correctly.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import type { Activity } from './types';

beforeEach(async () => {
  await db.activities.clear();
});

afterEach(async () => {
  await db.activities.clear();
});

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
