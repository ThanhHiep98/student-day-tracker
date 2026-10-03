import { setDoc } from 'firebase/firestore';
import { type UserScope, summaryDoc } from './firestore-paths';
import type { DaySummary, IsoDate } from './types';
import { trackWrite } from './use-sync-status';

/**
 * Persist a day's `DaySummary` (built by `build-day-summary.ts`). Fire-and-
 * forget like `day-rating-writes.ts` / `ai-comment-writes.ts`: applied to the
 * local cache at once, synced when online. Overwrites the single
 * `users/{uid}/summaries/{date}` document for that date. Called by
 * `use-day-summary-writer.ts`, which decides *when* a write is due (D16:
 * only while at least one parent is linked, debounced).
 */
export function saveDaySummary(scope: UserScope, date: IsoDate, summary: DaySummary): void {
  trackWrite(setDoc(summaryDoc(scope, date), summary));
}
