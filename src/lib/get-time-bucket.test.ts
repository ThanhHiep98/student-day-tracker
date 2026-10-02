import { describe, expect, it } from 'vitest';
import { getTimeBucket } from './get-time-bucket';

describe('getTimeBucket', () => {
  it('groups a start time into its 3-hour bucket', () => {
    expect(getTimeBucket(9 * 60)).toEqual({ start: 540, label: '09:00–12:00' });
    expect(getTimeBucket(11 * 60 + 59)).toEqual({ start: 540, label: '09:00–12:00' });
    expect(getTimeBucket(12 * 60)).toEqual({ start: 720, label: '12:00–15:00' });
  });

  it('covers the first and last buckets of the day', () => {
    expect(getTimeBucket(0).label).toBe('00:00–03:00');
    expect(getTimeBucket(1439).label).toBe('21:00–24:00');
  });
});
