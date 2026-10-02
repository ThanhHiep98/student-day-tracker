import { type CategoryMinutes, getDailySummary } from './get-daily-summary';
import { filterByDateRange } from './get-weekly-summary';
import { addDays } from './iso-date';
import type { Activity, Category, IsoDate } from './types';

export type CompareTrend = 'more' | 'less' | 'same' | 'new';

export interface CompareRow {
  categoryId: string;
  current: number;
  previous: number;
  deltaMinutes: number;
  trend: CompareTrend;
}

export type CompareResult = { kind: 'no-previous' } | { kind: 'ok'; rows: CompareRow[] };

/**
 * Req. 3.2 Compare: per-category delta between two periods. Returns
 * `no-previous` when the previous period has nothing tracked, so the UI
 * never shows a misleading "+100%" against an empty baseline (plan D2).
 * Rows are ordered by current minutes, then previous minutes, descending.
 */
export function comparePeriods(
  current: CategoryMinutes[],
  previous: CategoryMinutes[]
): CompareResult {
  const previousTotal = previous.reduce((sum, p) => sum + p.minutes, 0);
  if (previousTotal === 0) return { kind: 'no-previous' };

  const currentById = new Map(current.map((c) => [c.categoryId, c.minutes]));
  const previousById = new Map(previous.map((p) => [p.categoryId, p.minutes]));
  const ids = [...new Set([...currentById.keys(), ...previousById.keys()])];

  const rows = ids
    .map((categoryId): CompareRow => {
      const cur = currentById.get(categoryId) ?? 0;
      const prev = previousById.get(categoryId) ?? 0;
      const deltaMinutes = cur - prev;
      const trend: CompareTrend =
        prev === 0 ? 'new' : deltaMinutes > 0 ? 'more' : deltaMinutes < 0 ? 'less' : 'same';
      return { categoryId, current: cur, previous: prev, deltaMinutes, trend };
    })
    .filter((r) => r.current > 0 || r.previous > 0)
    .sort((a, b) => b.current - a.current || b.previous - a.previous);

  return { kind: 'ok', rows };
}

/**
 * Week-to-date (Mon…today) vs the same weekdays last week (Mon−7…today−7),
 * so a partial week is never compared against a full one (plan D3).
 */
export function getWeekToDateComparison(
  activities: Activity[],
  categories: Category[],
  { weekStart, today }: { weekStart: IsoDate; today: IsoDate }
): CompareResult {
  const current = getDailySummary(filterByDateRange(activities, weekStart, today), categories);
  const previous = getDailySummary(
    filterByDateRange(activities, addDays(weekStart, -7), addDays(today, -7)),
    categories
  );
  return comparePeriods(current.byCategory, previous.byCategory);
}
