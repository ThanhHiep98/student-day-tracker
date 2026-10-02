import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { StudentDayTrackerDB } from './db';
import type { FirebaseClient } from './firebase';

/**
 * Emulator-only hooks for Playwright (plan §2.4). Loaded by firebase.ts only
 * when NEXT_PUBLIC_FIREBASE_EMULATORS === '1', so neither this module nor the
 * `__sdtTest` name ends up in `out/`.
 *
 * - `signIn` signs in through the Auth emulator with a fake Google credential
 *   (the emulator accepts an unsigned JSON id token) and resolves to the uid.
 * - `dexie` is the legacy local database, so a test can seed pre-F2 data
 *   before the first sign-in and watch it migrate.
 */
export interface SdtTestHooks {
  signIn(sub: string, email: string, name: string): Promise<string>;
  /** Uid of the signed-in user (e.g. after the real popup flow), or null. */
  currentUid(): string | null;
  dexie: StudentDayTrackerDB;
}

declare global {
  interface Window {
    __sdtTest?: SdtTestHooks;
  }
}

export function installTestHooks({ auth }: FirebaseClient): void {
  let dexie: StudentDayTrackerDB | null = null;
  window.__sdtTest = {
    async signIn(sub, email, name) {
      const credential = GoogleAuthProvider.credential(
        JSON.stringify({ sub, email, email_verified: true, name })
      );
      const { user } = await signInWithCredential(auth, credential);
      return user.uid;
    },
    currentUid() {
      return auth.currentUser?.uid ?? null;
    },
    get dexie() {
      dexie ??= new StudentDayTrackerDB();
      return dexie;
    },
  };
}
