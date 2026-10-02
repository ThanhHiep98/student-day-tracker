'use client';

import { getDocs, query, where } from 'firebase/firestore';
import { type UserScope, activitiesCol } from './firestore-paths';
import type { Activity, IsoDate } from './types';
import { useFirestoreQuery } from './use-firestore-query';

function rangeQuery(scope: UserScope, start: IsoDate, end: IsoDate) {
  // Both bounds on the same field: a single-field range, no composite index.
  return query(activitiesCol(scope), where('date', '>=', start), where('date', '<=', end));
}

/** Activities with `date` in `[start, end]` (inclusive), read once. */
export async function getActivitiesInRange(
  scope: UserScope,
  start: IsoDate,
  end: IsoDate
): Promise<Activity[]> {
  const snapshot = await getDocs(rangeQuery(scope, start, end));
  return snapshot.docs.map((d) => d.data());
}

/** Live range query — powers Insights; `undefined` while loading. */
export function useActivitiesRange(start: IsoDate, end: IsoDate): Activity[] | undefined {
  return useFirestoreQuery(`activities|range=${start}..${end}`, (scope) =>
    rangeQuery(scope, start, end)
  );
}
