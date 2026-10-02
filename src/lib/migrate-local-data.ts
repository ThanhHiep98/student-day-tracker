import Dexie from 'dexie';
import { getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { StudentDayTrackerDB } from './db';
import {
  type UserScope,
  activitiesCol,
  activityDoc,
  categoriesCol,
  categoryDoc,
  userDoc,
} from './firestore-paths';
import { countMigrationOps, planDexieMigration } from './plan-dexie-migration';

/**
 * One-time copy of this device's pre-F2 Dexie data into the signed-in account
 * (plan §2.5 phase 2, ADR-007 activity diagram). Unlike UI writes, every
 * commit is awaited (online, 30 s timeout per batch): the markers are written
 * only after all batches reached the server.
 *
 * 1. Device marker set → skip (plan §2.2 Q8: only the first account that signs
 *    in on a device gets its local data).
 * 2. No local database → set the marker, skip.
 * 3. Read Dexie + the account's existing ids/categories, plan (pure, repeat-safe),
 *    commit each batch, then `migratedFromDexieAt` on the profile, then the
 *    device marker.
 *
 * Throws on any failure; Dexie is never written or deleted, so the next app
 * start simply retries (already-copied ids are skipped by the plan).
 */

export const DEVICE_MARKER_KEY = 'sdt-dexie-migrated';
export const LEGACY_DB_NAME = 'student-day-tracker';

const BATCH_TIMEOUT_MS = 30_000;

export interface MigrationStart {
  activities: number;
  categories: number;
  /** Total writes = the progress bar's `max`. */
  total: number;
  batches: number;
}

export interface MigrationProgress {
  done: number;
  total: number;
  /** 1-based index of the batch just committed. */
  batch: number;
  batches: number;
}

export type MigrationResult =
  | { status: 'skipped'; reason: 'device-marker' | 'no-local-db' | 'nothing-to-migrate' }
  | { status: 'migrated'; activities: number; categories: number };

export interface MigrateOptions {
  scope: UserScope;
  /** Called once, only when there is at least one write to make. */
  onStart?: (start: MigrationStart) => void;
  onProgress?: (progress: MigrationProgress) => void;
  /** Where the device marker lives; `localStorage` in the app. */
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  /** Legacy database name (overridable for tests). */
  dexieName?: string;
  now?: () => number;
  batchTimeoutMs?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function migrateLocalData({
  scope,
  onStart,
  onProgress,
  storage = localStorage,
  dexieName = LEGACY_DB_NAME,
  now = Date.now,
  batchTimeoutMs = BATCH_TIMEOUT_MS,
}: MigrateOptions): Promise<MigrationResult> {
  const markDevice = () =>
    storage.setItem(DEVICE_MARKER_KEY, JSON.stringify({ uid: scope.uid, at: now() }));

  if (storage.getItem(DEVICE_MARKER_KEY) !== null) {
    return { status: 'skipped', reason: 'device-marker' };
  }
  if (!(await Dexie.exists(dexieName))) {
    markDevice();
    return { status: 'skipped', reason: 'no-local-db' };
  }

  const dexie = new StudentDayTrackerDB(dexieName);
  let local: Awaited<ReturnType<typeof readLocal>>;
  try {
    local = await readLocal(dexie);
  } finally {
    dexie.close();
  }

  const [remoteActivities, remoteCategories] = await Promise.all([
    getDocs(activitiesCol(scope)),
    getDocs(categoriesCol(scope)),
  ]);
  const batches = planDexieMigration(local, {
    activityIds: remoteActivities.docs.map((d) => d.id),
    categories: remoteCategories.docs.map((d) => d.data()),
  });

  if (batches.length === 0) {
    markDevice();
    return { status: 'skipped', reason: 'nothing-to-migrate' };
  }

  const total = countMigrationOps(batches);
  const activities = batches.reduce((n, b) => n + b.activities.length, 0);
  const categories = batches.reduce((n, b) => n + b.categories.length, 0);
  onStart?.({ activities, categories, total, batches: batches.length });

  let done = 0;
  for (const [i, planned] of batches.entries()) {
    const batch = writeBatch(scope.db);
    for (const category of planned.categories) batch.set(categoryDoc(scope, category.id), category);
    for (const activity of planned.activities) batch.set(activityDoc(scope, activity.id), activity);
    await withTimeout(batch.commit(), batchTimeoutMs, `Migration batch ${i + 1}`);
    done += planned.categories.length + planned.activities.length;
    onProgress?.({ done, total, batch: i + 1, batches: batches.length });
  }

  await withTimeout(
    setDoc(userDoc(scope), { migratedFromDexieAt: now() }, { merge: true }),
    batchTimeoutMs,
    'Migration marker'
  );
  markDevice();
  return { status: 'migrated', activities, categories };
}

async function readLocal(dexie: StudentDayTrackerDB) {
  const [activities, categories] = await Promise.all([
    dexie.activities.toArray(),
    dexie.categories.toArray(),
  ]);
  return { activities, categories };
}
