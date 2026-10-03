import { setDoc } from 'firebase/firestore';
import { type UserScope, aiCommentDoc } from './firestore-paths';
import type { AiComment, IsoDate } from './types';
import { trackWrite } from './use-sync-status';

/**
 * Cache a generated weekly comment for `date` (ADR-009 §2.2 D11: at most one
 * Gemini call per user per day). Fire-and-forget like `day-rating-writes.ts`
 * — overwrites `users/{uid}/aiComments/{date}` for that date.
 */
export function saveAiComment(scope: UserScope, date: IsoDate, comment: AiComment): void {
  trackWrite(setDoc(aiCommentDoc(scope, date), comment));
}
