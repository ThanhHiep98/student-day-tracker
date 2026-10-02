import type { UserProfile } from './types';

/** Longest stored display name; firestore.rules enforces the same limit. */
export const DISPLAY_NAME_MAX = 200;

/** The Google account fields the profile is built from (a subset of Firebase's `User`). */
export interface ProfileSource {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * The `users/{uid}` document written on first sign-in (plan §2.4) — exactly
 * these five fields. Pure: `now` is passed in. The first sign-in accepts the
 * privacy notice, so `privacyAcceptedAt` = `createdAt`.
 */
export function buildUserProfile(user: ProfileSource, now: number): UserProfile {
  return {
    displayName: (user.displayName ?? '').trim().slice(0, DISPLAY_NAME_MAX),
    email: user.email ?? '',
    photoURL: user.photoURL ?? null,
    createdAt: now,
    privacyAcceptedAt: now,
  };
}
