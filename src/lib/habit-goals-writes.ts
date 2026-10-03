import { setDoc } from 'firebase/firestore';
import { type UserScope, habitGoalsDoc } from './firestore-paths';
import type { HabitGoals } from './types';
import { trackWrite } from './use-sync-status';

/**
 * Persist the questionnaire's answers, built by `buildHabitGoals` (which
 * validates and throws). Fire-and-forget like activity-writes.ts /
 * category-writes.ts: applied to the local cache at once, synced when online.
 * Overwrites the single `users/{uid}/goals/habits` document (D8 — no history).
 */
export function saveHabitGoals(scope: UserScope, goals: HabitGoals): void {
  trackWrite(setDoc(habitGoalsDoc(scope), goals));
}
