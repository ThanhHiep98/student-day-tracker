'use client';

import {
  GoogleAuthProvider,
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { getFirebase, resetFirebase } from './firebase';
import type { UserScope } from './firestore-paths';
import { hasUnsyncedWrites } from './use-sync-status';

/** The signed-in Google account, as the UI needs it. */
export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type AuthState =
  | { status: 'loading'; user: null; scope: null }
  | { status: 'signed-out'; user: null; scope: null }
  | { status: 'signed-in'; user: AuthUser; scope: UserScope };

const LOADING: AuthState = { status: 'loading', user: null, scope: null };
const SIGNED_OUT: AuthState = { status: 'signed-out', user: null, scope: null };

let state: AuthState = LOADING;
let started = false;
const listeners = new Set<() => void>();

function toState(user: User | null): AuthState {
  if (!user) return SIGNED_OUT;
  return {
    status: 'signed-in',
    user: {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    },
    scope: { db: getFirebase().db, uid: user.uid },
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    // Stays 'loading' until Firebase restored (or ruled out) a persisted
    // session, so a signed-in user never sees a flash of the sign-in screen.
    onAuthStateChanged(getFirebase().auth, (user) => {
      state = toState(user);
      for (const l of listeners) l();
    });
  }
  return () => listeners.delete(listener);
}

/**
 * Current auth state: `loading` → `signed-out` | `signed-in` (with the
 * `UserScope` every Firestore read/write takes). One `onAuthStateChanged`
 * subscription is shared by all callers.
 */
export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING
  );
}

/** Popup errors that mean "this browser can't do popups" — retry as a redirect. */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

/** The `code` of a Firebase error (`auth/popup-closed-by-user`, …), if any. */
export function authErrorCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

/**
 * Google sign-in (plan §2.2 Q3): popup everywhere — a redirect through
 * `authDomain` (firebaseapp.com) breaks under third-party-storage partitioning
 * on web.app — and a redirect only when popups are unavailable. The first
 * sign-in creates the account. Rejects with the Firebase error (its `code` is
 * used by the sign-in screen).
 */
export async function signInWithGoogle(): Promise<void> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = authErrorCode(err);
    if (code && REDIRECT_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

/** True when this device holds writes the server hasn't acknowledged (see use-sync-status.ts). */
export function deviceHasUnsyncedWrites(): Promise<boolean> {
  return hasUnsyncedWrites(getFirebase().db);
}

const PENDING_WRITES_TIMEOUT_MS = 5_000;

/**
 * Sign out and wipe this device's Firestore cache (plan §2.2 Q6 — shared
 * family devices): give queued writes up to 5 s to reach the server when
 * online, sign out, terminate Firestore, delete its IndexedDB cache, then
 * reload to the sign-in screen. Callers confirm first when offline with
 * unsynced writes (they would be lost).
 */
export async function signOutAndClear(): Promise<void> {
  const { auth, db } = getFirebase();
  if (navigator.onLine) {
    await Promise.race([
      waitForPendingWrites(db).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, PENDING_WRITES_TIMEOUT_MS)),
    ]);
  }
  await signOut(auth);
  await terminate(db);
  try {
    await clearIndexedDbPersistence(db);
  } catch (err) {
    // Another open tab still holds the cache; it is cleared on that tab's sign-out.
    console.warn('Could not clear the Firestore cache', err);
  }
  await resetFirebase();
  window.location.assign('/');
}
