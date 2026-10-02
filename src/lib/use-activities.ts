'use client';

import { query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { activitiesCol } from './firestore-paths';
import type { Activity, IsoDate } from './types';
import { useFirestoreQuery } from './use-firestore-query';

/** Start time first; ties by id so the order is stable across snapshots. */
export function byStartMinutes(a: Activity, b: Activity): number {
  return a.startMinutes - b.startMinutes || a.id.localeCompare(b.id);
}

/**
 * Live query: all activities tracked on `date` (`YYYY-MM-DD`), sorted by start
 * time; `undefined` while loading. Filters on one field and sorts client-side
 * (no composite index).
 */
export function useActivities(date: IsoDate): Activity[] | undefined {
  const rows = useFirestoreQuery(`activities|date=${date}`, (scope) =>
    query(activitiesCol(scope), where('date', '==', date))
  );
  return useMemo(() => rows && [...rows].sort(byStartMinutes), [rows]);
}
