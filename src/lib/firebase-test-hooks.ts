import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { setAiClientOverride } from './ai';
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
  /** F3: make the next AI call(s) resolve with `text` instead of reaching Gemini. */
  setAiReply(text: string): void;
  /** F3: make the next AI call(s) fail, simulating offline/quota/model errors. */
  setAiError(): void;
}

declare global {
  interface Window {
    __sdtTest?: SdtTestHooks;
  }
}

export function installTestHooks({ auth }: FirebaseClient): void {
  let dexie: StudentDayTrackerDB | null = null;
  // F3: never let an emulator build reach the real Gemini API by accident —
  // default to a failing client (exercises the rule-based fallback) until a
  // test opts into a reply via setAiReply/setAiError.
  setAiClientOverride({
    generate() {
      return Promise.reject(new Error('AI mocked by default in emulator builds'));
    },
  });
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
    setAiReply(text) {
      setAiClientOverride({ generate: () => Promise.resolve(text) });
    },
    setAiError() {
      setAiClientOverride({
        generate: () => Promise.reject(new Error('mock AI error')),
      });
    },
  };
}
