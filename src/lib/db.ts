import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_CATEGORIES } from './default-categories';
import type { Activity, Category } from './types';

/**
 * Thin Dexie client. Declares stores, indexes, and the default-category seed
 * only. Business logic (add/edit/delete activity, daily/weekly aggregation
 * for Insights) lives in pure helpers next to their tests, so it can be
 * exercised without touching IndexedDB. See docs/ARCHITECTURE.md.
 */
export class StudentDayTrackerDB extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  activities!: EntityTable<Activity, 'id'>;

  /** `name` is overridable only so the integration test can exercise a v1 → v2 upgrade. */
  constructor(name = 'student-day-tracker') {
    super(name);

    // `date` alone powers Home ("today") and History (calendar day lookup).
    // `[date+categoryId]` powers the daily-summary-by-category breakdown and
    // the Insights weekly/monthly aggregation without a full table scan.
    this.version(1).stores({
      categories: 'id, isDefault, createdAt',
      activities: 'id, date, categoryId, [date+categoryId]',
    });

    // v2 (cross-midnight, plans/2026-10-01-v2-roadmap-cross-midnight.html):
    // index `spanId` so Edit/Delete can load both rows of a span. Index-only,
    // so no upgrade function — existing rows simply have no spanId.
    this.version(2).stores({
      activities: 'id, date, categoryId, [date+categoryId], spanId',
    });

    this.on('populate', () => {
      this.categories.bulkAdd(DEFAULT_CATEGORIES as Category[]);
    });
  }
}

export const db = new StudentDayTrackerDB();
export type { Activity, Category } from './types';
