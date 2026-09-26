import type { Activity, Category } from './types';

export interface CategoryMinutes {
  categoryId: string;
  minutes: number;
}

export interface DailySummary {
  totalMinutes: number;
  byCategory: CategoryMinutes[];
}

/**
 * Aggregate a day's activities into a total and a per-category breakdown,
 * ordered by minutes descending — the shape the Home "Daily summary" card
 * (req. 1.1) and the Insights breakdowns both consume.
 *
 * Pure — no Dexie. Overlapping/out-of-range activities are the caller's
 * concern; this only sums `endMinutes - startMinutes` per activity.
 */
export function getDailySummary(activities: Activity[], categories: Category[]): DailySummary {
  const knownCategoryIds = new Set(categories.map((c) => c.id));
  const minutesByCategory = new Map<string, number>();

  let totalMinutes = 0;
  for (const activity of activities) {
    const duration = Math.max(0, activity.endMinutes - activity.startMinutes);
    totalMinutes += duration;
    if (!knownCategoryIds.has(activity.categoryId)) continue;
    minutesByCategory.set(
      activity.categoryId,
      (minutesByCategory.get(activity.categoryId) ?? 0) + duration
    );
  }

  const byCategory = [...minutesByCategory.entries()]
    .map(([categoryId, minutes]) => ({ categoryId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  return { totalMinutes, byCategory };
}

/** Format minutes as `1h 30m` / `45m` / `0m` for display. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
