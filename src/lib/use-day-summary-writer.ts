'use client';

import { useEffect } from 'react';
import { buildDaySummary } from './build-day-summary';
import { evaluateDay } from './evaluate-day';
import type { UserScope } from './firestore-paths';
import { getDayEfficiency } from './get-efficiency';
import { saveDaySummary } from './summary-writes';
import type { Activity, HabitGoals, IsoDate } from './types';

/** D16: wait this long after the last change before writing, so a burst of
 * edits (adding several activities in a row) produces one write, not one per
 * keystroke/save. */
export const SUMMARY_WRITE_DEBOUNCE_MS = 2000;

export interface DayRatingScore {
  date: IsoDate;
  score: number;
}

export interface UseDaySummaryWriterArgs {
  scope: UserScope | null;
  /**
   * D16: "only while at least one parent is linked." Parent linking doesn't
   * exist until ADR-009 slice 8b, so this is a single boolean the caller
   * fully controls — 8b will drive it from `useParentLinks().length > 0`.
   * `auth-gate.tsx` currently passes a hardcoded `false` (see
   * `docs/ARCHITECTURE.md` "Status"): this writer is complete and tested,
   * but makes no production writes yet.
   */
  enabled: boolean;
  /** Which days to keep `summaries/{date}` in sync for — today and
   * yesterday from the caller, plus any day whose activities/goals/rating
   * were just edited. Pass a referentially stable array (e.g. `useMemo`): a
   * fresh array every render would restart the debounce on every re-render. */
  dates: IsoDate[];
  /** `activities` must cover `dates` plus the day before the earliest one
   * (cross-midnight sleep, see `evaluate-day.ts`); `undefined` while the
   * range query is still loading. */
  activities: Activity[] | undefined;
  /** `null` = this account never completed onboarding — nothing to evaluate
   * against yet, so no summary is written; `undefined` while loading. */
  goals: HabitGoals | null | undefined;
  /** This account's day ratings covering `dates`; `undefined` while loading. */
  ratings: DayRatingScore[] | undefined;
  /** Passed in, never read from the clock (CLAUDE.md) — the caller supplies
   * `new Date()`, tests supply a fixed instant. */
  now: Date;
}

/**
 * ADR-009 §2.1/§2.5 D16 slice 8a — upserts `users/{uid}/summaries/{date}`
 * (via `saveDaySummary`, fire-and-forget through `trackWrite`) for every date
 * in `dates`, debounced, whenever the inputs actually change. A no-op while
 * `enabled` is false, `scope` is null, or any input is still loading/unset —
 * so a half-loaded page never writes a bogus "untracked" summary over a real
 * one. Pure evaluation (`evaluateDay`/`getDayEfficiency`/`buildDaySummary`)
 * does the actual work; this hook only decides *when* to call it.
 */
export function useDaySummaryWriter({
  scope,
  enabled,
  dates,
  activities,
  goals,
  ratings,
  now,
}: UseDaySummaryWriterArgs): void {
  useEffect(() => {
    if (!enabled || !scope || !activities || !goals || !ratings) return;

    const timer = setTimeout(() => {
      for (const date of dates) {
        const evaluation = evaluateDay(activities, goals, date, now);
        const efficiency = getDayEfficiency(evaluation);
        const ratingScore = ratings.find((r) => r.date === date)?.score ?? null;
        const summary = buildDaySummary(evaluation, efficiency, ratingScore, Date.now());
        saveDaySummary(scope, date, summary);
      }
    }, SUMMARY_WRITE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [scope, enabled, dates, activities, goals, ratings, now]);
}
