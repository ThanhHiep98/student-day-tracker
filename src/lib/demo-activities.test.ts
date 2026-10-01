import { describe, expect, it } from 'vitest';
import { DEMO_ID_PREFIX, buildDemoActivities, isDemoActivity } from './demo-activities';
import type { Activity } from './types';

describe('buildDemoActivities', () => {
  let n = 0;
  const activities = buildDemoActivities('2026-10-01', 1_000_000, () => `uuid-${n++}`);

  it('prefixes every id with demo-', () => {
    expect(activities.length).toBeGreaterThan(0);
    expect(activities.every((a) => a.id.startsWith(DEMO_ID_PREFIX))).toBe(true);
    expect(activities[0].id).toBe('demo-uuid-0');
  });

  it('spans today and the 6 days before it, using the passed-in today', () => {
    const dates = [...new Set(activities.map((a) => a.date))].sort();
    expect(dates).toEqual([
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ]);
  });

  it('only produces valid same-day time ranges', () => {
    for (const a of activities) {
      expect(a.startMinutes).toBeGreaterThanOrEqual(0);
      expect(a.endMinutes).toBeLessThanOrEqual(1439);
      expect(a.endMinutes).toBeGreaterThan(a.startMinutes);
    }
  });
});

describe('isDemoActivity', () => {
  const base: Activity = {
    id: '',
    name: 'x',
    categoryId: 'work',
    date: '2026-10-01',
    startMinutes: 0,
    endMinutes: 1,
    createdAt: 0,
  };

  it('is true only for ids starting with demo-', () => {
    expect(isDemoActivity({ ...base, id: 'demo-123' })).toBe(true);
    expect(isDemoActivity({ ...base, id: '123-demo' })).toBe(false);
    expect(isDemoActivity({ ...base, id: 'a1b2' })).toBe(false);
  });
});
