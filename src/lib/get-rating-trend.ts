import type { DayRating, IsoDate } from './types';

export interface RatingTrendDay {
  date: IsoDate;
  score: DayRating['score'] | null;
}

export interface RatingTrend {
  days: RatingTrendDay[];
  /** Mean score over rated days only (D7); `null` when nothing in the window is rated. */
  average: number | null;
}

/**
 * "How your days felt" (ADR-009 §1.2 ⑤/§2.6): one cell per day in `weekDays`,
 * the day's score when rated, else `null`. Untracked days are excluded from
 * the average (D7), never counted as 0.
 */
export function getRatingTrend(
  ratings: { date: IsoDate; score: DayRating['score'] }[],
  weekDays: IsoDate[]
): RatingTrend {
  const byDate = new Map(ratings.map((r) => [r.date, r.score]));
  const days = weekDays.map((date) => ({ date, score: byDate.get(date) ?? null }));
  const scored = days
    .map((d) => d.score)
    .filter((score): score is DayRating['score'] => score !== null);
  const average = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  return { days, average };
}
