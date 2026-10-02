import { setDoc } from 'firebase/firestore';
import { type UserScope, categoryDoc } from './firestore-paths';
import type { Category } from './types';
import { trackWrite } from './use-sync-status';

/**
 * Persist a custom category built by `buildCategory` (which validates and
 * throws). Fire-and-forget like activity-writes.ts: applied to the local cache
 * at once, synced when online. Default categories are never stored.
 */
export function addCategory(scope: UserScope, category: Category): void {
  trackWrite(setDoc(categoryDoc(scope, category.id), category));
}
