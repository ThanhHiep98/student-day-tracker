import type { IsoDate } from './types';

/** Format a Date as `YYYY-MM-DD` in the local timezone. */
export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * True for a strict `YYYY-MM-DD` string naming a real calendar date
 * (rejects `2026-02-29`, `2026-04-31`, single-digit parts, etc.).
 */
export function isIsoDate(value: string): value is IsoDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toIsoDate(fromIsoDate(value)) === value;
}

/** Parse a `YYYY-MM-DD` string as a local-midnight Date. */
export function fromIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add `days` (can be negative) to a `YYYY-MM-DD` string. */
export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Monday of the calendar week containing `iso` (weeks run Mon–Sun, matching History). */
export function startOfWeek(iso: IsoDate): IsoDate {
  const weekday = fromIsoDate(iso).getDay(); // 0 = Sunday
  const daysSinceMonday = (weekday + 6) % 7;
  return addDays(iso, -daysSinceMonday);
}

/** First day of the calendar month containing `iso`. */
export function startOfMonth(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 7)}-01`;
}

/** Last day of the calendar month containing `iso`. */
export function endOfMonth(iso: IsoDate): IsoDate {
  const [y, m] = iso.split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  return toIsoDate(new Date(y, m, 0));
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const ms = fromIsoDate(to).getTime() - fromIsoDate(from).getTime();
  // Round to absorb DST shifts of ±1h between two local midnights.
  return Math.round(ms / 86_400_000);
}
