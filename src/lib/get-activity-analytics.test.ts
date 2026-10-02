import { describe, expect, it } from 'vitest';
import { getActivityAnalytics } from './get-activity-analytics';
import type { Activity } from './types';

let seq = 0;
const act = (name: string, date: string, start: number, end: number): Activity => ({
  id: `a${seq++}`,
  name,
  categoryId: 'work',
  date,
  startMinutes: start,
  endMinutes: end,
  createdAt: 0,
});

describe('getActivityAnalytics', () => {
  it('returns an empty list with no activities', () => {
    expect(getActivityAnalytics([])).toEqual([]);
  });

  it('groups by trimmed, case-insensitive name and sorts by total descending', () => {
    const result = getActivityAnalytics([
      act('Gym', '2026-09-02', 900, 945),
      act('Design', '2026-09-01', 540, 700), // 2h 40m
      act(' design ', '2026-09-03', 600, 660), // 1h
      act('DESIGN', '2026-09-04', 840, 900), // 1h, 12:00–15:00 bucket
    ]);
    expect(result).toEqual([
      {
        key: 'design',
        name: 'Design',
        totalMinutes: 280,
        sessions: 3,
        averageSessionMinutes: 93,
        longestSessionMinutes: 160,
        mostCommonTime: '09:00–12:00',
      },
      {
        key: 'gym',
        name: 'Gym',
        totalMinutes: 45,
        sessions: 1,
        averageSessionMinutes: 45,
        longestSessionMinutes: 45,
        mostCommonTime: '15:00–18:00',
      },
    ]);
  });

  it('uses the earliest occurrence for the display name and breaks bucket ties by earlier time', () => {
    const [row] = getActivityAnalytics([
      act('read', '2026-09-05', 1200, 1260),
      act('Read', '2026-09-01', 600, 660),
    ]);
    expect(row.name).toBe('Read');
    expect(row.mostCommonTime).toBe('09:00–12:00');
  });

  it('counts a cross-midnight span as one session while summing both days', () => {
    const head: Activity = { ...act('Sleep', '2026-09-01', 1260, 1440), id: 's1', spanId: 's1' };
    const tail: Activity = {
      ...act('Sleep', '2026-09-02', 0, 60),
      id: 's1-next',
      spanId: 's1',
    };
    const [row] = getActivityAnalytics([tail, head, act('Sleep', '2026-09-03', 60, 120)]);
    expect(row).toEqual({
      key: 'sleep',
      name: 'Sleep',
      totalMinutes: 300,
      sessions: 2,
      averageSessionMinutes: 150,
      longestSessionMinutes: 240,
      // 1 session at 21:00 (span head) vs 1 at 01:00: the tie goes to the earlier bucket.
      mostCommonTime: '00:00–03:00',
    });
  });

  it('uses the head start for a span when picking the most common time', () => {
    const span = (id: string, d1: string, d2: string): Activity[] => [
      { ...act('Sleep', d1, 1260, 1440), id, spanId: id },
      { ...act('Sleep', d2, 0, 60), id: `${id}-next`, spanId: id },
    ];
    const [row] = getActivityAnalytics([
      ...span('s1', '2026-09-01', '2026-09-02'),
      ...span('s2', '2026-09-03', '2026-09-04'),
      act('Sleep', '2026-09-05', 60, 120),
    ]);
    expect(row.sessions).toBe(3);
    expect(row.mostCommonTime).toBe('21:00–24:00');
  });

  it('still counts a span whose head falls outside the range (tail only)', () => {
    const tailOnly: Activity = { ...act('Sleep', '2026-09-01', 0, 60), id: 'x-next', spanId: 'x' };
    const [row] = getActivityAnalytics([tailOnly]);
    expect(row.sessions).toBe(1);
    expect(row.mostCommonTime).toBe('00:00–03:00');
  });
});
