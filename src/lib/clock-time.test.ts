import { describe, expect, it } from 'vitest';
import { clockToMinutes, minutesToClock } from './clock-time';

describe('minutesToClock', () => {
  it('pads to HH:MM and wraps 1440 to 00:00', () => {
    expect(minutesToClock(0)).toBe('00:00');
    expect(minutesToClock(90)).toBe('01:30');
    expect(minutesToClock(1439)).toBe('23:59');
    expect(minutesToClock(1440)).toBe('00:00');
  });
});

describe('clockToMinutes', () => {
  it('parses a strict HH:MM string', () => {
    expect(clockToMinutes('06:30')).toBe(390);
    expect(clockToMinutes('23:00')).toBe(1380);
  });

  it('rejects anything else', () => {
    expect(clockToMinutes('6:30')).toBeNull();
    expect(clockToMinutes('')).toBeNull();
    expect(clockToMinutes('not a time')).toBeNull();
  });
});
