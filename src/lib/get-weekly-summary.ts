import { type CategoryMinutes, getDailySummary } from './get-daily-summary';
import { addDays } from './iso-date';
import type { Activity, Category, IsoDate } from './types';

/** Fixed Mon…Sun labels — not locale-dependent, so tests and SSR are stable. */
export const WEEKDAY_SHORT_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_LONG_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export interface WeeklyDay {
  date: IsoDate;
  label: string;
  minutes: number;
}

export interface WeeklySummary {
  days: WeeklyDay[];
  byCategory: CategoryMinutes[];
  totalMinutes: number;
}

/** Activities whose `date` is within `[start, end]` (inclusive). */
export function filterByDateRange(
  activities: Activity[],
  start: IsoDate,
  end: IsoDate
): Activity[] {
  return activities.filter((a) => a.date >= start && a.date <= end);
}

/**
 * Req. 3.1 Weekly Overview: minutes per day for the Mon–Sun week starting at
 * `weekStart`, plus the per-category breakdown for that week.
 */
export function getWeeklySummary(
  activities: Activity[],
  categories: Category[],
  weekStart: IsoDate
): WeeklySummary {
  const dates = WEEKDAY_SHORT_LABELS.map((_, i) => addDays(weekStart, i));
  const inWeek = filterByDateRange(activities, dates[0], dates[6]);

  const days = dates.map((date, i) => ({
    date,
    label: WEEKDAY_SHORT_LABELS[i],
    minutes: getDailySummary(
      inWeek.filter((a) => a.date === date),
      categories
    ).totalMinutes,
  }));

  const { totalMinutes, byCategory } = getDailySummary(inWeek, categories);
  return { days, byCategory, totalMinutes };
}
