import { activityNameKey } from './get-activity-analytics';
import { type CategoryMinutes, getDailySummary } from './get-daily-summary';
import { WEEKDAY_LONG_LABELS, filterByDateRange } from './get-weekly-summary';
import { daysBetween, endOfMonth, startOfWeek } from './iso-date';
import type { Activity, Category, IsoDate } from './types';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface MonthlySummary {
  month: string;
  totalMinutes: number;
  topCategory: CategoryMinutes;
  mostActiveDay: string;
  mostCommonActivity: string;
  averagePerDayMinutes: number;
}

const duration = (a: Activity) => Math.max(0, a.endMinutes - a.startMinutes);

/**
 * Req. 3.3 Monthly Overview for the calendar month starting at `monthStart`.
 * Returns null when nothing (in a known category) was tracked that month, so
 * the UI shows an empty state instead of zero-value rows (plan D2).
 *
 * Tie-breaks: top category by category `createdAt`, most active weekday
 * Monday-first, most common activity by more minutes then earliest seen.
 */
export function getMonthlySummary(
  activities: Activity[],
  categories: Category[],
  monthStart: IsoDate
): MonthlySummary | null {
  const known = new Set(categories.map((c) => c.id));
  const inMonth = filterByDateRange(activities, monthStart, endOfMonth(monthStart))
    .filter((a) => known.has(a.categoryId) && duration(a) > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
  if (inMonth.length === 0) return null;

  const { totalMinutes, byCategory } = getDailySummary(inMonth, categories);
  const rank = new Map(
    [...categories].sort((a, b) => a.createdAt - b.createdAt).map((c, i) => [c.id, i])
  );
  const [topCategory] = [...byCategory].sort(
    (a, b) => b.minutes - a.minutes || (rank.get(a.categoryId) ?? 0) - (rank.get(b.categoryId) ?? 0)
  );

  const minutesByWeekday = new Array<number>(7).fill(0);
  const trackedDates = new Set<IsoDate>();
  const byName = new Map<string, { name: string; count: number; minutes: number; order: number }>();
  for (const a of inMonth) {
    minutesByWeekday[daysBetween(startOfWeek(a.date), a.date)] += duration(a);
    trackedDates.add(a.date);
    const key = activityNameKey(a.name);
    const entry = byName.get(key) ?? {
      name: a.name.trim(),
      count: 0,
      minutes: 0,
      order: byName.size,
    };
    entry.count++;
    entry.minutes += duration(a);
    byName.set(key, entry);
  }

  const mostActiveIndex = minutesByWeekday.indexOf(Math.max(...minutesByWeekday));
  const [mostCommon] = [...byName.values()].sort(
    (a, b) => b.count - a.count || b.minutes - a.minutes || a.order - b.order
  );
  const monthIndex = Number(monthStart.slice(5, 7)) - 1;

  return {
    month: MONTH_LABELS[monthIndex],
    totalMinutes,
    topCategory,
    mostActiveDay: WEEKDAY_LONG_LABELS[mostActiveIndex],
    mostCommonActivity: mostCommon.name,
    averagePerDayMinutes: Math.round(totalMinutes / trackedDates.size),
  };
}
