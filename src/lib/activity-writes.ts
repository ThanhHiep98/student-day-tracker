import {
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { type ActivityInput, buildUpdatedActivity } from './build-activity';
import { type UserScope, activitiesCol, activityDoc } from './firestore-paths';
import type { Activity, Category } from './types';
import { trackWrite } from './use-sync-status';

/**
 * Firestore writes for activities (plan §2.4). Every operation acts on all
 * stored rows of one activity — one row, or both rows of a cross-midnight
 * span — in a single `writeBatch`, so a span is never left half-written.
 *
 * Writes are fire-and-forget: the batch is applied to the local cache at once
 * (the live queries re-render, the form can close) and handed to
 * `trackWrite()`; it is never awaited, because offline a commit only resolves
 * once the server acknowledged it. Validation still happens synchronously in
 * the pure builders, so a thrown message reaches the form.
 */

type ActivityRef = Pick<Activity, 'id' | 'spanId'>;

const TAIL_ID_SUFFIX = '-next';

/** Persist the row(s) returned by `buildActivity`. */
export function addActivityRows(scope: UserScope, rows: Activity[]): void {
  const batch = writeBatch(scope.db);
  for (const row of rows) batch.set(activityDoc(scope, row.id), row);
  trackWrite(batch.commit());
}

/**
 * All stored rows of the activity `row` belongs to (both rows for a span).
 * Reads the local cache first — the rows on screen are already cached, and
 * this keeps Edit working offline — and asks the server only on a cache miss.
 */
export async function getActivityRows(scope: UserScope, row: ActivityRef): Promise<Activity[]> {
  if (row.spanId !== undefined) {
    const spanQuery = query(activitiesCol(scope), where('spanId', '==', row.spanId));
    const cached = await getDocsFromCache(spanQuery).catch(() => null);
    const snapshot = cached && !cached.empty ? cached : await getDocs(spanQuery);
    return snapshot.docs.map((d) => d.data());
  }
  const ref = activityDoc(scope, row.id);
  const cached = await getDocFromCache(ref).catch(() => null);
  const snapshot = cached?.exists() ? cached : await getDoc(ref);
  const stored = snapshot.data();
  return stored ? [stored] : [];
}

/** Apply an edit made from either row of an activity to the whole activity. */
export async function updateActivity(
  scope: UserScope,
  row: ActivityRef,
  input: ActivityInput,
  categories: Category[]
): Promise<void> {
  const existing = await getActivityRows(scope, row);
  const { put, deleteIds } = buildUpdatedActivity(existing, input, categories);
  const batch = writeBatch(scope.db);
  for (const id of deleteIds) batch.delete(activityDoc(scope, id));
  for (const updated of put) batch.set(activityDoc(scope, updated.id), updated);
  trackWrite(batch.commit());
}

/**
 * Delete an activity — both rows when it is a span. A span's row ids are
 * derived from `spanId` (head = spanId, tail = `${spanId}-next`), so no read
 * is needed and this works offline.
 */
export function deleteActivity(scope: UserScope, row: ActivityRef): void {
  const ids = row.spanId !== undefined ? [row.spanId, `${row.spanId}${TAIL_ID_SUFFIX}`] : [row.id];
  const batch = writeBatch(scope.db);
  for (const id of ids) batch.delete(activityDoc(scope, id));
  trackWrite(batch.commit());
}
