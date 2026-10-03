import { describe, expect, it } from 'vitest';
import { DAY_RATING_NOTE_MAX, buildDayRating, isDayRatable } from './build-day-rating';

const TODAY = '2026-10-03';
const META = { updatedAt: 1_700_000_000_000 };

describe('isDayRatable (D2: today + previous 7 days)', () => {
  it('accepts today and the boundary 7 days ago', () => {
    expect(isDayRatable('2026-10-03', TODAY)).toBe(true);
    expect(isDayRatable('2026-09-26', TODAY)).toBe(true);
  });

  it('rejects 8 days ago and any future date', () => {
    expect(isDayRatable('2026-09-25', TODAY)).toBe(false);
    expect(isDayRatable('2026-10-04', TODAY)).toBe(false);
  });

  it('rejects malformed dates', () => {
    expect(isDayRatable('not-a-date', TODAY)).toBe(false);
    expect(isDayRatable(TODAY, 'not-a-date')).toBe(false);
  });
});

describe('buildDayRating', () => {
  it('builds a DayRating with no note field when none is given', () => {
    const rating = buildDayRating({ date: TODAY, score: 4 }, META, TODAY);
    expect(rating).toEqual({ score: 4, updatedAt: META.updatedAt });
    expect(rating).not.toHaveProperty('note');
  });

  it('trims the note and keeps it when non-empty', () => {
    const rating = buildDayRating({ date: TODAY, score: 3, note: '  ổn  ' }, META, TODAY);
    expect(rating.note).toBe('ổn');
  });

  it('drops a note that is empty or only whitespace', () => {
    expect(buildDayRating({ date: TODAY, score: 3, note: '' }, META, TODAY)).not.toHaveProperty(
      'note'
    );
    expect(buildDayRating({ date: TODAY, score: 3, note: '   ' }, META, TODAY)).not.toHaveProperty(
      'note'
    );
  });

  it('accepts a note at exactly the limit and rejects one char over', () => {
    const maxNote = 'a'.repeat(DAY_RATING_NOTE_MAX);
    expect(() =>
      buildDayRating({ date: TODAY, score: 3, note: maxNote }, META, TODAY)
    ).not.toThrow();
    expect(() =>
      buildDayRating({ date: TODAY, score: 3, note: `${maxNote}a` }, META, TODAY)
    ).toThrow(`Note must be ${DAY_RATING_NOTE_MAX} characters or fewer.`);
  });

  it('accepts score boundaries 1 and 5, rejects 0, 6, and non-integers', () => {
    expect(() => buildDayRating({ date: TODAY, score: 1 }, META, TODAY)).not.toThrow();
    expect(() => buildDayRating({ date: TODAY, score: 5 }, META, TODAY)).not.toThrow();
    expect(() => buildDayRating({ date: TODAY, score: 0 }, META, TODAY)).toThrow(
      'Choose a rating from 1 to 5.'
    );
    expect(() => buildDayRating({ date: TODAY, score: 6 }, META, TODAY)).toThrow(
      'Choose a rating from 1 to 5.'
    );
    expect(() => buildDayRating({ date: TODAY, score: 3.5 }, META, TODAY)).toThrow(
      'Choose a rating from 1 to 5.'
    );
  });

  it('rejects a malformed date', () => {
    expect(() => buildDayRating({ date: '2026-13-40', score: 3 }, META, TODAY)).toThrow(
      'Choose a valid date.'
    );
  });

  it('rejects a date outside the D2 window', () => {
    expect(() => buildDayRating({ date: '2026-09-25', score: 3 }, META, TODAY)).toThrow(
      'You can only rate today or the previous 7 days.'
    );
    expect(() => buildDayRating({ date: '2026-10-04', score: 3 }, META, TODAY)).toThrow(
      'You can only rate today or the previous 7 days.'
    );
  });
});
