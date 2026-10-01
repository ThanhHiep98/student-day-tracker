import { describe, expect, it } from 'vitest';
import { addDays, endOfMonth, fromIsoDate, startOfMonth, startOfWeek, toIsoDate } from './iso-date';

describe('toIsoDate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('fromIsoDate', () => {
  it('parses a YYYY-MM-DD string back to a Date at local midnight', () => {
    const date = fromIsoDate('2026-03-14');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(14);
  });
});

describe('addDays', () => {
  it('adds a positive number of days', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
  });

  it('subtracts when given a negative number', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('handles year boundaries', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('round-trips through toIsoDate and fromIsoDate', () => {
    expect(toIsoDate(fromIsoDate('2026-07-20'))).toBe('2026-07-20');
  });
});

describe('startOfWeek', () => {
  it('returns the Monday of the week (Monday-start)', () => {
    expect(startOfWeek('2026-10-01')).toBe('2026-09-28'); // Thursday
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28'); // Monday
  });

  it('treats Sunday as the last day of the week, not the first', () => {
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28');
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05');
  });

  it('crosses month and year boundaries', () => {
    expect(startOfWeek('2026-01-01')).toBe('2025-12-29');
  });
});

describe('startOfMonth / endOfMonth', () => {
  it('returns the first and last day of the month', () => {
    expect(startOfMonth('2026-09-17')).toBe('2026-09-01');
    expect(endOfMonth('2026-09-17')).toBe('2026-09-30');
  });

  it('handles February in leap and non-leap years', () => {
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
  });

  it('handles December', () => {
    expect(endOfMonth('2026-12-05')).toBe('2026-12-31');
  });
});
