'use client';

import type { UserScope } from '@/lib/firestore-paths';
import { addDays, toIsoDate } from '@/lib/iso-date';
import { useActivitiesRange } from '@/lib/use-activities-range';
import { useDayRatingsRange } from '@/lib/use-day-ratings-range';
import { useDaySummaryWriter } from '@/lib/use-day-summary-writer';
import { useHabitGoals } from '@/lib/use-habit-goals';
import { useMemo } from 'react';

/**
 * ADR-009 §2.2 D16, slice 8a — keeps `users/{uid}/summaries/{date}` in sync
 * for today and yesterday while `enabled`. Mounted once in `auth-gate.tsx`
 * alongside `FirstRunTasks`, so it runs regardless of which page is open and
 * survives navigation between pages. Renders nothing.
 *
 * `enabled` is a hardcoded `false` at the call site until ADR-009 slice 8b
 * adds parent linking (D16: "only while at least one parent is linked") —
 * see `docs/ARCHITECTURE.md` "Status". The writer itself (this component,
 * `use-day-summary-writer.ts`, `build-day-summary.ts`, `summary-writes.ts`)
 * is complete and tested; only the production gate is off.
 */
export function DaySummaryWriter({
  scope,
  enabled,
}: {
  scope: UserScope;
  enabled: boolean;
}) {
  const today = toIsoDate(new Date());
  const yesterday = addDays(today, -1);
  // `evaluateDay` only ever compares `date < toIsoDate(now)` (date strings,
  // not time-of-day), so midnight of `today` is equivalent to the exact
  // instant here and keeps `now`'s reference stable across re-renders within
  // the same day — otherwise `new Date()` on every render would restart the
  // writer's debounce before it ever fires.
  const now = useMemo(() => new Date(`${today}T00:00:00`), [today]);
  const dates = useMemo(() => [yesterday, today], [yesterday, today]);

  // Covers the day before yesterday too: a cross-midnight sleep span ending
  // yesterday has its bedtime row on the day before (evaluate-day.ts).
  const activities = useActivitiesRange(addDays(yesterday, -1), today);
  const goals = useHabitGoals();
  const ratingsRange = useDayRatingsRange(yesterday, today);
  const ratings = useMemo(
    () => ratingsRange?.map((r) => ({ date: r.date, score: r.score })),
    [ratingsRange]
  );

  useDaySummaryWriter({ scope, enabled, dates, activities, goals, ratings, now });

  return null;
}
