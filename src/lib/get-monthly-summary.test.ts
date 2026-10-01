import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './default-categories';
import { getMonthlySummary } from './get-monthly-summary';
import type { Activity, Category } from './types';

const categories: Category[] = [...DEFAULT_CATEGORIES];
let seq = 0;
const act = (
  date: string,
  name: string,
  categoryId: string,
  start: number,
  end: number
): Activity => ({
  id: `a${seq++}`,
  name,
  categoryId,
  date,
  startMinutes: start,
  endMinutes: end,
  createdAt: 0,
});

describe('getMonthlySummary', () => {
  it('returns null for a month with no activities', () => {
    expect(getMonthlySummary([], categories, '2026-09-01')).toBeNull();
    // Rows outside the month don't count.
    expect(
      getMonthlySummary([act('2026-10-01', 'X', 'work', 0, 60)], categories, '2026-09-01')
    ).toBeNull();
  });

  it('summarises a fixed month', () => {
    const activities = [
      act('2026-08-31', 'Outside', 'work', 0, 600), // previous month — excluded
      act('2026-09-01', 'Design', 'work', 540, 720), // Tue 3h
      act('2026-09-01', 'Gym', 'exercise', 1000, 1060), // Tue 1h
      act('2026-09-08', ' design ', 'work', 540, 600), // Tue 1h
      act('2026-09-10', 'Read', 'study', 600, 720), // Thu 2h
      act('2026-09-30', 'Read', 'study', 600, 660), // Wed 1h
    ];
    expect(getMonthlySummary(activities, categories, '2026-09-01')).toEqual({
      month: 'September',
      totalMinutes: 480,
      topCategory: { categoryId: 'work', minutes: 240 },
      mostActiveDay: 'Tuesday',
      mostCommonActivity: 'Design',
      averagePerDayMinutes: 120, // 480m over 4 tracked days
    });
  });

  it('breaks ties: top category by createdAt, weekday by Mon-first, activity by minutes', () => {
    const activities = [
      act('2026-09-02', 'Gym', 'exercise', 0, 60), // Wed
      act('2026-09-01', 'Read', 'study', 0, 60), // Tue
      act('2026-09-03', 'Read', 'study', 0, 30), // Thu
      act('2026-09-04', 'Gym', 'exercise', 0, 30), // Fri
    ];
    const summary = getMonthlySummary(activities, categories, '2026-09-01');
    expect(summary?.topCategory.categoryId).toBe('study');
    expect(summary?.mostActiveDay).toBe('Tuesday');
    expect(summary?.averagePerDayMinutes).toBe(45);
  });
});
