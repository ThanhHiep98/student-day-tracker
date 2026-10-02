import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './default-categories';
import { getWeeklySummary } from './get-weekly-summary';
import type { Activity, Category } from './types';

const categories: Category[] = [...DEFAULT_CATEGORIES];
let seq = 0;
const act = (date: string, categoryId: string, start: number, end: number): Activity => ({
  id: `a${seq++}`,
  name: categoryId,
  categoryId,
  date,
  startMinutes: start,
  endMinutes: end,
  createdAt: 0,
});

describe('getWeeklySummary', () => {
  it('returns 7 Mon-Sun days with zero minutes for an empty week', () => {
    const summary = getWeeklySummary([], categories, '2026-09-28');
    expect(summary.totalMinutes).toBe(0);
    expect(summary.byCategory).toEqual([]);
    expect(summary.days).toEqual([
      { date: '2026-09-28', label: 'Mon', minutes: 0 },
      { date: '2026-09-29', label: 'Tue', minutes: 0 },
      { date: '2026-09-30', label: 'Wed', minutes: 0 },
      { date: '2026-10-01', label: 'Thu', minutes: 0 },
      { date: '2026-10-02', label: 'Fri', minutes: 0 },
      { date: '2026-10-03', label: 'Sat', minutes: 0 },
      { date: '2026-10-04', label: 'Sun', minutes: 0 },
    ]);
  });

  it('buckets minutes per day and per category, ignoring the days around the week', () => {
    const activities = [
      act('2026-09-27', 'work', 0, 600), // previous Sunday — excluded
      act('2026-09-28', 'work', 540, 630), // Mon 1h 30m
      act('2026-09-28', 'study', 700, 760), // Mon 1h
      act('2026-10-04', 'exercise', 60, 90), // Sun 30m
      act('2026-10-05', 'work', 0, 600), // next Monday — excluded
    ];
    const summary = getWeeklySummary(activities, categories, '2026-09-28');
    expect(summary.days.map((d) => d.minutes)).toEqual([150, 0, 0, 0, 0, 0, 30]);
    expect(summary.totalMinutes).toBe(180);
    expect(summary.byCategory).toEqual([
      { categoryId: 'work', minutes: 90 },
      { categoryId: 'study', minutes: 60 },
      { categoryId: 'exercise', minutes: 30 },
    ]);
  });
});
