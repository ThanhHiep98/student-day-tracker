'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/** Live query: every category (default + user-created), oldest first. */
export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy('createdAt').toArray(), []);
}
