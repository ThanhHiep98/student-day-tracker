import { describe, expect, it } from 'vitest';
import { getRatingTrend } from './get-rating-trend';

const WEEK = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'] as const;

describe('getRatingTrend', () => {
  it('maps each day to its score, or null when untracked', () => {
    const trend = getRatingTrend(
      [
        { date: '2026-09-28', score: 3 },
        { date: '2026-09-30', score: 5 },
      ],
      [...WEEK]
    );
    expect(trend.days).toEqual([
      { date: '2026-09-28', score: 3 },
      { date: '2026-09-29', score: null },
      { date: '2026-09-30', score: 5 },
      { date: '2026-10-01', score: null },
      { date: '2026-10-02', score: null },
    ]);
  });

  it('averages only the rated days (D7 — untracked days excluded)', () => {
    const trend = getRatingTrend(
      [
        { date: '2026-09-28', score: 2 },
        { date: '2026-09-30', score: 4 },
      ],
      [...WEEK]
    );
    expect(trend.average).toBe(3);
  });

  it('is null when no day in the window is rated', () => {
    expect(getRatingTrend([], [...WEEK]).average).toBeNull();
  });

  it('ignores ratings outside the given window', () => {
    const trend = getRatingTrend([{ date: '2026-10-05', score: 5 }], [...WEEK]);
    expect(trend.average).toBeNull();
    expect(trend.days.every((d) => d.score === null)).toBe(true);
  });
});
