import { describe, expect, it } from 'vitest';
import { formatMinutes, getDailySummary } from './get-daily-summary';
import type { Activity, Category } from './types';

const category = (id: string): Category => ({
  id,
  name: id,
  color: '#000',
  icon: '•',
  isDefault: true,
  createdAt: 0,
});

const activity = (categoryId: string, start: number, end: number): Activity => ({
  id: `${categoryId}-${start}`,
  categoryId,
  name: categoryId,
  date: '2026-09-25',
  startMinutes: start,
  endMinutes: end,
  createdAt: 0,
});

describe('getDailySummary', () => {
  it('returns zero total and no categories for an empty day', () => {
    expect(getDailySummary([], [])).toEqual({ totalMinutes: 0, byCategory: [] });
  });

  it('sums durations per category and overall', () => {
    const categories = [category('work'), category('study')];
    const activities = [
      activity('work', 0, 90),
      activity('work', 90, 120),
      activity('study', 0, 60),
    ];

    const summary = getDailySummary(activities, categories);

    expect(summary.totalMinutes).toBe(180);
    expect(summary.byCategory).toEqual([
      { categoryId: 'work', minutes: 120 },
      { categoryId: 'study', minutes: 60 },
    ]);
  });

  it('sorts categories by minutes descending', () => {
    const categories = [category('a'), category('b'), category('c')];
    const activities = [activity('a', 0, 10), activity('b', 0, 60), activity('c', 0, 30)];

    const summary = getDailySummary(activities, categories);

    expect(summary.byCategory.map((c) => c.categoryId)).toEqual(['b', 'c', 'a']);
  });

  it('ignores activities whose category no longer exists', () => {
    const activities = [activity('deleted-category', 0, 30)];
    const summary = getDailySummary(activities, []);
    expect(summary.totalMinutes).toBe(30);
    expect(summary.byCategory).toEqual([]);
  });

  it('clamps a negative or zero duration to 0 instead of going negative', () => {
    const activities = [activity('work', 60, 30)];
    const summary = getDailySummary(activities, [category('work')]);
    expect(summary.totalMinutes).toBe(0);
  });
});

describe('formatMinutes', () => {
  it('formats whole hours with no minutes', () => {
    expect(formatMinutes(120)).toBe('2h');
  });

  it('formats minutes under an hour', () => {
    expect(formatMinutes(45)).toBe('45m');
  });

  it('formats a mix of hours and minutes', () => {
    expect(formatMinutes(395)).toBe('6h 35m');
  });

  it('formats zero as 0m', () => {
    expect(formatMinutes(0)).toBe('0m');
  });
});
