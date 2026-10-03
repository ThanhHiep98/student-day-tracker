'use client';

import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { toUserProfile } from './firestore-converters';
import { userDoc } from './firestore-paths';
import type { UserProfile } from './types';
import { useAuth } from './use-auth';

/**
 * Live `users/{uid}` profile doc. `undefined` while loading (or signed out);
 * `null` once loaded if the profile hasn't been created yet (shouldn't
 * normally happen post-sign-in, `ensureUserProfile` races it, but a
 * first-load flash is possible). Read-only — writes go through
 * `ensureUserProfile`/`setAiConsent` in `user-profile.ts`.
 */
export function useUserProfile(): UserProfile | null | undefined {
  const { scope } = useAuth();
  const uid = scope?.uid ?? null;
  const [result, setResult] = useState<{ uid: string; data: UserProfile | null } | null>(null);

  useEffect(() => {
    if (!scope) return;
    const currentUid = scope.uid;
    return onSnapshot(
      userDoc(scope),
      (snapshot) =>
        setResult({
          uid: currentUid,
          data: snapshot.exists() ? toUserProfile(snapshot.data()) : null,
        }),
      (err) => {
        console.error('User profile query failed', err);
        setResult({ uid: currentUid, data: null });
      }
    );
  }, [scope]);

  if (!uid) return undefined;
  return result !== null && result.uid === uid ? result.data : undefined;
}
