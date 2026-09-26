/**
 * Core data model for Student Day Tracker.
 *
 * Two stores: `categories` (fixed defaults + user-created) and `activities`
 * (a single tracked block of time on a given day). `Activity.date` is an ISO
 * `YYYY-MM-DD` string (not a Date object) — it indexes cleanly in IndexedDB,
 * sorts lexicographically, and avoids timezone pitfalls when grouping by day
 * for History and Insights.
 *
 * `startMinutes` / `endMinutes` are minutes-since-midnight (0-1439) rather
 * than full timestamps, which keeps duration math (`end - start`) trivial and
 * timezone-independent within a single tracked day.
 */

export type IsoDate = string;

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  /** Fixed categories (Work / Study / Exercise / Entertainment) ship with the
   * app and cannot be deleted; user-created categories can. */
  isDefault: boolean;
  createdAt: number;
}

export interface Activity {
  id: string;
  categoryId: string;
  name: string;
  date: IsoDate;
  startMinutes: number;
  endMinutes: number;
  createdAt: number;
}
