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
});
