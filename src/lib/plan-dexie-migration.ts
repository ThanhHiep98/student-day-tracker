import { MINUTES_PER_DAY, sessionKey } from './activity-span';
import { ACTIVITY_NAME_MAX } from './build-activity';
import { CATEGORY_NAME_MAX } from './build-category';
import { DEFAULT_CATEGORIES } from './default-categories';
import { isDemoActivity } from './demo-activities';
import { toActivity, toCategory } from './firestore-converters';
import { isIsoDate } from './iso-date';
import type { Activity, Category } from './types';

/** One Firestore `writeBatch`: categories are always planned before activities. */
export interface MigrationBatch {
  categories: Category[];
  activities: Activity[];
}

export interface LocalData {
  activities: Activity[];
  categories: Category[];
}

export interface RemoteData {
  /** Ids already stored under `users/{uid}/activities`. */
  activityIds: Iterable<string>;
  /** Custom categories already stored under `users/{uid}/categories`. */
  categories: Category[];
}

/** Firestore's hard limit on writes per batch. */
export const MAX_BATCH_OPS = 500;

const DEFAULT_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

const nameKey = (name: string) => name.trim().toLowerCase();

/** Same shape checks as `validActivity` in firestore.rules — a row failing them would fail its whole batch forever. */
function isStorableActivity(a: Activity): boolean {
  return (
    typeof a.id === 'string' &&
    a.id.length > 0 &&
    typeof a.categoryId === 'string' &&
    a.categoryId.length > 0 &&
    typeof a.name === 'string' &&
    a.name.trim().length > 0 &&
    typeof a.date === 'string' &&
    isIsoDate(a.date) &&
    Number.isInteger(a.startMinutes) &&
    Number.isInteger(a.endMinutes) &&
    a.startMinutes >= 0 &&
    a.startMinutes <= MINUTES_PER_DAY - 1 &&
    a.endMinutes >= 1 &&
    a.endMinutes <= MINUTES_PER_DAY &&
    a.startMinutes < a.endMinutes &&
    typeof a.createdAt === 'number'
  );
}

/**
 * Plan the one-time copy of a device's Dexie data into the signed-in account
 * (plan §2.5 phase 1, §2.2 Q4/Q8). Pure, so repeat-safety is unit-tested:
 *
 * - Default categories live in code and are never written; demo (`demo-*`)
 *   rows are skipped; ids already stored remotely are skipped — so a re-run
 *   after success plans nothing.
 * - A local custom category whose name matches (case-insensitively) a default
 *   or a remote category is not written; its activities are remapped to that
 *   category's id instead.
 * - Both rows of a cross-midnight span always land in the same batch.
 * - Unknown keys are dropped and over-long names capped to the rules limits;
 *   rows the rules would reject anyway are skipped.
 */
export function planDexieMigration(
  local: LocalData,
  remote: RemoteData,
  maxOps = MAX_BATCH_OPS
): MigrationBatch[] {
  if (maxOps < 2) throw new Error('maxOps must fit a cross-midnight pair (>= 2).');

  const remoteActivityIds = new Set(remote.activityIds);
  const remoteCategoryIds = new Set(remote.categories.map((c) => c.id));
  const idByName = new Map<string, string>();
  for (const c of [...DEFAULT_CATEGORIES, ...remote.categories]) {
    if (!idByName.has(nameKey(c.name))) idByName.set(nameKey(c.name), c.id);
  }

  const categoryRemap = new Map<string, string>();
  const categories: Category[] = [];
  for (const category of local.categories) {
    if (category.isDefault || DEFAULT_IDS.has(category.id)) continue;
    if (remoteCategoryIds.has(category.id)) continue;
    const match = idByName.get(nameKey(category.name));
    if (match !== undefined) {
      categoryRemap.set(category.id, match);
      continue;
    }
    const clean = toCategory({ ...category });
    clean.name = clean.name.trim().slice(0, CATEGORY_NAME_MAX);
    idByName.set(nameKey(clean.name), clean.id);
    categories.push(clean);
  }

  // Group rows by session (a span's two rows share a key), in first-seen order.
  const groups = new Map<string, Activity[]>();
  for (const row of local.activities) {
    if (isDemoActivity(row) || remoteActivityIds.has(row.id) || !isStorableActivity(row)) continue;
    const clean = toActivity({ ...row });
    clean.name = clean.name.trim().slice(0, ACTIVITY_NAME_MAX);
    clean.categoryId = categoryRemap.get(clean.categoryId) ?? clean.categoryId;
    const key = sessionKey(clean);
    const group = groups.get(key);
    if (group) group.push(clean);
    else groups.set(key, [clean]);
  }

  const batches: MigrationBatch[] = [];
  let current: MigrationBatch = { categories: [], activities: [] };
  const size = (b: MigrationBatch) => b.categories.length + b.activities.length;
  const flush = () => {
    if (size(current) > 0) batches.push(current);
    current = { categories: [], activities: [] };
  };

  for (const category of categories) {
    if (size(current) + 1 > maxOps) flush();
    current.categories.push(category);
  }
  for (const group of groups.values()) {
    if (size(current) + group.length > maxOps) flush();
    current.activities.push(...group);
  }
  flush();
  return batches;
}

/** Total writes across all batches (the migration dialog's progress `max`). */
export function countMigrationOps(batches: MigrationBatch[]): number {
  return batches.reduce((sum, b) => sum + b.categories.length + b.activities.length, 0);
}
