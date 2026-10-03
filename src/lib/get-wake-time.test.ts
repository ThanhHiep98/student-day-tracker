import { describe, expect, it } from 'vitest';
import { getWakeTime } from './get-wake-time';

describe('getWakeTime', () => {
  it('adds the sleep target to the bedtime (23:00 + 7h30 = 06:30, ADR-008 §1.2 ②)', () => {
    expect(getWakeTime(23 * 60, 7 * 60 + 30)).toBe(6 * 60 + 30);
  });

  it('wraps past midnight for a bedtime before midnight plus a long sleep', () => {
    expect(getWakeTime(22 * 60, 10 * 60)).toBe(8 * 60);
  });

  it('wraps for a bedtime already after midnight', () => {
    expect(getWakeTime(60, 8 * 60)).toBe(9 * 60);
  });

  it('a zero-length sleep wakes at the bedtime', () => {
    expect(getWakeTime(90, 0)).toBe(90);
  });
});
