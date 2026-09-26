import { describe, expect, it } from 'vitest';
import { buildMonthGrid } from './build-month-grid';

describe('buildMonthGrid', () => {
  it('pads September 2026 (starts on a Tuesday) with 1 leading blank', () => {
    const { weeks } = buildMonthGrid(2026, 8); // September = month 8
    expect(weeks[0]).toEqual([
      null,
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ]);
  });

  it('every week has exactly 7 cells', () => {
    const { weeks } = buildMonthGrid(2026, 8);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it('trailing weeks pad with null past the last day of the month', () => {
    const { weeks } = buildMonthGrid(2026, 8); // Sept has 30 days
    const last = weeks[weeks.length - 1];
    expect(last).toContain('2026-09-30');
    expect(last.some((d) => d === null)).toBe(true);
  });

  it('a month starting on Monday has no leading blanks', () => {
    // 2026-06-01 is a Monday.
    const { weeks } = buildMonthGrid(2026, 5);
    expect(weeks[0][0]).toBe('2026-06-01');
    expect(weeks[0].every((d) => d !== null)).toBe(true);
  });

  it('handles February in a leap year', () => {
    const { weeks } = buildMonthGrid(2028, 1);
    const flat = weeks.flat().filter((d): d is string => d !== null);
    expect(flat).toHaveLength(29);
    expect(flat[flat.length - 1]).toBe('2028-02-29');
  });
});
