import { describe, expect, it } from 'vitest';
import { isSpanTail, mergeActivitySpan, sessionKey, spanDurationMinutes } from './activity-span';
import type { Activity } from './types';

const base: Activity = {
  id: 'a1',
  name: 'Read',
  categoryId: 'study',
  date: '2026-09-28',
  startMinutes: 540,
  endMinutes: 630,
  createdAt: 1,
};
const head: Activity = {
  ...base,
  id: 's1',
  spanId: 's1',
  name: 'Sleep',
  startMinutes: 1260,
  endMinutes: 1440,
};
const tail: Activity = {
  ...head,
  id: 's1-next',
  date: '2026-09-29',
  startMinutes: 0,
  endMinutes: 60,
};

describe('mergeActivitySpan', () => {
  it('reads a same-day row back as form input', () => {
    expect(mergeActivitySpan([base])).toEqual({
      name: 'Read',
      categoryId: 'study',
      date: '2026-09-28',
      startMinutes: 540,
      endMinutes: 630,
    });
  });

  it('reads an end of 1440 back as 00:00', () => {
    expect(mergeActivitySpan([{ ...base, startMinutes: 1260, endMinutes: 1440 }]).endMinutes).toBe(
      0
    );
  });

  it('merges a span (in either order) into start date + start + end', () => {
    const expected = {
      name: 'Sleep',
      categoryId: 'study',
      date: '2026-09-28',
      startMinutes: 1260,
      endMinutes: 60,
    };
    expect(mergeActivitySpan([head, tail])).toEqual(expected);
    expect(mergeActivitySpan([tail, head])).toEqual(expected);
  });

  it('throws on an empty list', () => {
    expect(() => mergeActivitySpan([])).toThrow();
  });
});

describe('sessionKey / isSpanTail', () => {
  it('keys a span by spanId and a same-day row by id', () => {
    expect(sessionKey(head)).toBe('s1');
    expect(sessionKey(tail)).toBe('s1');
    expect(sessionKey(base)).toBe('a1');
  });

  it('identifies only the tail row of a span', () => {
    expect(isSpanTail(tail)).toBe(true);
    expect(isSpanTail(head)).toBe(false);
    expect(isSpanTail(base)).toBe(false);
  });
});

describe('spanDurationMinutes', () => {
  it('returns end - start for a same-day range', () => {
    expect(spanDurationMinutes(540, 630)).toBe(90);
  });

  it('wraps past midnight when end is before start', () => {
    expect(spanDurationMinutes(1260, 60)).toBe(240);
    expect(spanDurationMinutes(1260, 0)).toBe(180);
  });

  it('returns 0 when start equals end', () => {
    expect(spanDurationMinutes(600, 600)).toBe(0);
  });
});
