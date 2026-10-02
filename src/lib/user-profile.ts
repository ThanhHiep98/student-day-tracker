import { getDoc, setDoc } from 'firebase/firestore';
import { type ProfileSource, buildUserProfile } from './build-user-profile';
import { type UserScope, userDoc } from './firestore-paths';
import { trackWrite } from './use-sync-status';

/**
 * Create `users/{uid}` on the account's first sign-in (plan §2.4) — the
 * "Tạo User" step; there is no separate sign-up. Existing profiles are left
 * alone. The create is queued (fire-and-forget) and applied locally at once,
 * so a following `migratedFromDexieAt` merge lands on top of it in order.
 * Rejects when the profile can't be read (offline before the first sync).
 */
export async function ensureUserProfile(
  scope: UserScope,
  user: ProfileSource,
  now: number = Date.now()
): Promise<'created' | 'exists'> {
  const ref = userDoc(scope);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return 'exists';
  trackWrite(setDoc(ref, buildUserProfile(user, now)));
  return 'created';
}
