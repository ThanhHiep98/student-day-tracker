'use client';

import { documentId, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { dayRatingsCol } from './firestore-paths';
import type { DayRating, IsoDate } from './types';
import { useAuth } from './use-auth';

/** A stored rating paired with its date (the doc id, not part of `DayRating` itself). */
export interface DayRatingEntry {
  date: IsoDate;
  score: DayRating['score'];
  note?: string;
  updatedAt: number;
}

/**
 * Live range query over `users/{uid}/dayRatings` with `date` in `[start, end]`
 * (inclusive) — powers "How your days felt" on Insights and History. The doc
 * id *is* the date (dayRatingDoc), so this subscribes directly (rather than
 * reusing `useFirestoreQuery`) to pair each snapshot with its id.
 * `undefined` while loading.
 */
export function useDayRatingsRange(start: IsoDate, end: IsoDate): DayRatingEntry[] | undefined {
  const { scope } = useAuth();
  const uid = scope?.uid ?? null;
  const fullKey = uid ? `${uid}|${start}..${end}` : null;
  const [result, setResult] = useState<{ key: string; data: DayRatingEntry[] } | null>(null);

  useEffect(() => {
    if (!scope) return;
    const key = `${scope.uid}|${start}..${end}`;
    // documentId() range: doc ids are IsoDate strings, so this sorts/filters
    // exactly like a `date` field range would, with no composite index.
    const q = query(
      dayRatingsCol(scope),
      where(documentId(), '>=', start),
      where(documentId(), '<=', end)
    );
    return onSnapshot(
      q,
      (snapshot) =>
        setResult({
          key,
          data: snapshot.docs.map((d) => ({ date: d.id, ...d.data() })),
        }),
      (err) => {
        console.error('Day ratings range query failed', err);
        setResult({ key, data: [] });
      }
    );
  }, [scope, start, end]);

  if (!fullKey) return undefined;
  return result !== null && result.key === fullKey ? result.data : undefined;
}
