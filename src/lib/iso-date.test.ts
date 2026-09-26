import { describe, expect, it } from 'vitest';
import { addDays, fromIsoDate, toIsoDate } from './iso-date';

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
