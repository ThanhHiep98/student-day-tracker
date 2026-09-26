import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_CATEGORIES } from './default-categories';
import type { Activity, Category } from './types';

/**
 * Thin Dexie client. Declares stores, indexes, and the default-category seed
 * only. Business logic (add/edit/delete activity, daily/weekly aggregation
 * for Insights) lives in pure helpers next to their tests, so it can be
 * exercised without touching IndexedDB. See docs/ARCHITECTURE.md.
 */
class StudentDayTrackerDB extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  activities!: EntityTable<Activity, 'id'>;

  constructor() {
    super('student-day-tracker');

    // `date` alone powers Home ("today") and History (calendar day lookup).
    // `[date+categoryId]` powers the daily-summary-by-category breakdown and
    // the Insights weekly/monthly aggregation without a full table scan.
    this.version(1).stores({
      categories: 'id, isDefault, createdAt',
      activities: 'id, date, categoryId, [date+categoryId]',
    });

    this.on('populate', () => {
      this.categories.bulkAdd(DEFAULT_CATEGORIES as Category[]);
    });
  }
}

export const db = new StudentDayTrackerDB();
export type { Activity, Category } from './types';
