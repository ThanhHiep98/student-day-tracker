import { type ActivityInput, buildUpdatedActivity } from './build-activity';
import { db } from './db';
import type { Activity, Category } from './types';

/**
 * Dexie writes for activities. Every operation acts on all stored rows of one
 * activity (one row, or both rows of a cross-midnight span) inside a single
 * `rw` transaction, so a span is never left half-written. Validation lives in
 * the pure builders (build-activity.ts); a thrown message aborts the
 * transaction and propagates to the form.
 */

/** Persist the row(s) returned by `buildActivity`. */
export async function addActivityRows(rows: Activity[]): Promise<void> {
  await db.transaction('rw', db.activities, async () => {
    await db.activities.bulkAdd(rows);
  });
}

/** All stored rows of the activity `row` belongs to (both rows for a span). */
export async function getActivityRows(row: Pick<Activity, 'id' | 'spanId'>): Promise<Activity[]> {
  if (row.spanId !== undefined) {
    return db.activities.where('spanId').equals(row.spanId).toArray();
  }
  const stored = await db.activities.get(row.id);
  return stored ? [stored] : [];
}

/** Apply an edit made from either row of an activity to the whole activity. */
export async function updateActivity(
  row: Pick<Activity, 'id' | 'spanId'>,
  input: ActivityInput,
  categories: Category[]
): Promise<void> {
  await db.transaction('rw', db.activities, async () => {
    const existing = await getActivityRows(row);
    const { put, deleteIds } = buildUpdatedActivity(existing, input, categories);
    if (deleteIds.length > 0) await db.activities.bulkDelete(deleteIds);
    await db.activities.bulkPut(put);
  });
}

/** Delete an activity — both rows when it is a span. */
export async function deleteActivity(row: Pick<Activity, 'id' | 'spanId'>): Promise<void> {
  await db.transaction('rw', db.activities, async () => {
    if (row.spanId !== undefined) {
      await db.activities.where('spanId').equals(row.spanId).delete();
    } else {
      await db.activities.delete(row.id);
    }
  });
}
