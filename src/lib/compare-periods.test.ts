import { describe, expect, it } from 'vitest';
import { comparePeriods, getWeekToDateComparison } from './compare-periods';
import { DEFAULT_CATEGORIES } from './default-categories';
import type { Activity, Category } from './types';

describe('comparePeriods', () => {
  it('returns no-previous when the previous period totals 0', () => {
    expect(comparePeriods([{ categoryId: 'work', minutes: 60 }], [])).toEqual({
      kind: 'no-previous',
    });
    expect(
      comparePeriods([{ categoryId: 'work', minutes: 60 }], [{ categoryId: 'work', minutes: 0 }])
    ).toEqual({ kind: 'no-previous' });
  });

  it('marks each category as more / less / same / new', () => {
    const result = comparePeriods(
      [
        { categoryId: 'work', minutes: 1275 },
        { categoryId: 'study', minutes: 300 },
        { categoryId: 'exercise', minutes: 60 },
        { categoryId: 'custom', minutes: 45 },
      ],
      [
        { categoryId: 'work', minutes: 1120 },
        { categoryId: 'study', minutes: 370 },
        { categoryId: 'exercise', minutes: 60 },
        { categoryId: 'entertainment', minutes: 90 },
      ]
    );
    expect(result).toEqual({
      kind: 'ok',
      rows: [
        { categoryId: 'work', current: 1275, previous: 1120, deltaMinutes: 155, trend: 'more' },
        { categoryId: 'study', current: 300, previous: 370, deltaMinutes: -70, trend: 'less' },
        { categoryId: 'exercise', current: 60, previous: 60, deltaMinutes: 0, trend: 'same' },
        { categoryId: 'custom', current: 45, previous: 0, deltaMinutes: 45, trend: 'new' },
        {
          categoryId: 'entertainment',
          current: 0,
          previous: 90,
          deltaMinutes: -90,
          trend: 'less',
        },
      ],
    });
  });
});

describe('getWeekToDateComparison', () => {
  const categories: Category[] = [...DEFAULT_CATEGORIES];
  const act = (id: string, date: string, minutes: number): Activity => ({
    id,
    name: 'x',
    categoryId: 'work',
    date,
    startMinutes: 0,
    endMinutes: minutes,
    createdAt: 0,
  });

  it('compares Mon..today against the same weekdays last week only', () => {
    // today = Wed 2026-09-30, weekStart = Mon 2026-09-28
    const activities = [
      act('a', '2026-09-28', 60), // this Mon
      act('b', '2026-09-30', 30), // this Wed
      act('c', '2026-09-21', 40), // last Mon
      act('d', '2026-09-23', 20), // last Wed (same weekday as today)
      act('e', '2026-09-24', 500), // last Thu — beyond today−7, excluded
      act('f', '2026-09-20', 500), // Sunday before last week — excluded
    ];
    expect(
      getWeekToDateComparison(activities, categories, {
        weekStart: '2026-09-28',
        today: '2026-09-30',
      })
    ).toEqual({
      kind: 'ok',
      rows: [{ categoryId: 'work', current: 90, previous: 60, deltaMinutes: 30, trend: 'more' }],
    });
  });

  it('is no-previous when last week only has data after today−7', () => {
    const activities = [act('a', '2026-09-28', 60), act('e', '2026-09-24', 500)];
    expect(
      getWeekToDateComparison(activities, categories, {
        weekStart: '2026-09-28',
        today: '2026-09-30',
      })
    ).toEqual({ kind: 'no-previous' });
  });
});
