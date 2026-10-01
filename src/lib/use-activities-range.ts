'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { IsoDate } from './types';

/** Activities with `date` in `[start, end]` (inclusive) — powers Insights. */
export function getActivitiesInRange(start: IsoDate, end: IsoDate) {
  return db.activities.where('date').between(start, end, true, true).toArray();
}

/** Live query over `getActivitiesInRange`; `undefined` while loading. */
export function useActivitiesRange(start: IsoDate, end: IsoDate) {
  return useLiveQuery(() => getActivitiesInRange(start, end), [start, end]);
}
