'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/** Live query: all activities tracked on `date` (`YYYY-MM-DD`), sorted by start time. */
export function useActivities(date: string) {
  return useLiveQuery(
    () => db.activities.where('date').equals(date).sortBy('startMinutes'),
    [date]
  );
}
