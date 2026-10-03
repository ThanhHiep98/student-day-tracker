import { setDoc } from 'firebase/firestore';
import { type UserScope, dayRatingDoc } from './firestore-paths';
import type { DayRating, IsoDate } from './types';
import { trackWrite } from './use-sync-status';

/**
 * Persist a day's rating, built by `buildDayRating` (which validates and
 * throws). Fire-and-forget like habit-goals-writes.ts / activity-writes.ts:
 * applied to the local cache at once, synced when online. Overwrites the
 * single `users/{uid}/dayRatings/{date}` document for that date (one rating
 * per day — editing just replaces it).
 */
export function saveDayRating(scope: UserScope, date: IsoDate, rating: DayRating): void {
  trackWrite(setDoc(dayRatingDoc(scope, date), rating));
}
