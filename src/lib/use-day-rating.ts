'use client';

import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { dayRatingDoc } from './firestore-paths';
import type { DayRating, IsoDate } from './types';
import { useAuth } from './use-auth';

/**
 * Live `users/{uid}/dayRatings/{date}` doc (ADR-009 §2.5) — the `onSnapshot`
 * single-document counterpart to `useFirestoreQuery`'s collection queries,
 * same shape as `useHabitGoals`. `undefined` while loading (or signed out);
 * `null` once loaded if `date` has no rating yet; otherwise the stored
 * rating. A new `date` resubscribes and reports `undefined` until the new
 * doc arrives, so a page never shows one day's rating under another's.
 */
export function useDayRating(date: IsoDate): DayRating | null | undefined {
  const { scope } = useAuth();
  const uid = scope?.uid ?? null;
  const fullKey = uid ? `${uid}|${date}` : null;
  const [result, setResult] = useState<{ key: string; data: DayRating | null } | null>(null);

  useEffect(() => {
    if (!scope) return;
    const key = `${scope.uid}|${date}`;
    return onSnapshot(
      dayRatingDoc(scope, date),
      (snapshot) => setResult({ key, data: snapshot.exists() ? snapshot.data() : null }),
      (err) => {
        console.error('Day rating query failed', err);
        setResult({ key, data: null });
      }
    );
  }, [scope, date]);

  if (!fullKey) return undefined;
  return result !== null && result.key === fullKey ? result.data : undefined;
}
