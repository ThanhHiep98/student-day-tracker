import { addDays, isIsoDate } from './iso-date';
import type { DayRating, IsoDate } from './types';

/** Longest note; firestore.rules enforces the same limit. */
export const DAY_RATING_NOTE_MAX = 280;

/** D2: a day can be rated today or within the previous this many days. */
export const DAY_RATING_WINDOW_DAYS = 7;

/** The score + optional note submitted by the rating card, before validation. */
export interface DayRatingInput {
  date: IsoDate;
  score: number;
  note?: string;
}

export interface DayRatingMeta {
  updatedAt: number;
}

/**
 * True when `date` is today or one of the previous `DAY_RATING_WINDOW_DAYS`
 * days (ADR-009 D2) — drives both the "editable" window in the UI and the
 * validation in `buildDayRating`.
 */
export function isDayRatable(date: IsoDate, today: IsoDate): boolean {
  if (!isIsoDate(date) || !isIsoDate(today)) return false;
  if (date > today) return false;
  return date >= addDays(today, -DAY_RATING_WINDOW_DAYS);
}

/**
 * Validate and assemble a `users/{uid}/dayRatings/{date}` document (ADR-009
 * D1/D2). Pure — throws a user-facing message on the first violation
 * (mirrored by firestore.rules); the caller persists the result via
 * `saveDayRating`. The date itself is not stored in the document (it is the
 * doc id), but it is still validated here against D2's rating window.
 */
export function buildDayRating(
  input: DayRatingInput,
  meta: DayRatingMeta,
  today: IsoDate
): DayRating {
  if (!isIsoDate(input.date)) throw new Error('Choose a valid date.');
  if (!isDayRatable(input.date, today)) {
    throw new Error('You can only rate today or the previous 7 days.');
  }
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    throw new Error('Choose a rating from 1 to 5.');
  }

  const note = input.note?.trim();
  if (note && note.length > DAY_RATING_NOTE_MAX) {
    throw new Error(`Note must be ${DAY_RATING_NOTE_MAX} characters or fewer.`);
  }

  const rating: DayRating = {
    score: input.score as DayRating['score'],
    updatedAt: meta.updatedAt,
  };
  if (note) rating.note = note;
  return rating;
}
