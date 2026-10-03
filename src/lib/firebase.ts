import { type FirebaseApp, deleteApp, initializeApp } from 'firebase/app';
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from 'firebase/app-check';
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  type Firestore,
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { APP_CHECK_SITE_KEY, firebaseConfig } from './firebase-config';

/**
 * Lazy Firebase singletons (plan §2.4 implementation notes). Nothing is
 * initialised at module top level: the static export prerenders every route
 * in Node, where there is no IndexedDB and no signed-in user.
 *
 * Browser: Firestore with a persistent, multi-tab IndexedDB cache — reads and
 * writes work offline after the first sign-in. Node (emulator tests): an
 * in-memory cache.
 *
 * Emulators are used only when NEXT_PUBLIC_FIREBASE_EMULATORS === '1' (inlined
 * at build time, so the branch is dead code in production builds) and the page
 * is served from localhost — never against the real project.
 */

/** Fake `demo-*` project the emulators run as: no credentials, nothing real. */
export const EMULATOR_PROJECT_ID = 'demo-sdt';

export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

function emulatorsEnabled(): boolean {
  // Must stay a literal `process.env.X` read so Next inlines it.
  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS !== '1') return false;
  if (typeof window === 'undefined') return true;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

/**
 * App Check (ADR-009 §2.2 D12), real reCAPTCHA Enterprise provider, skipped
 * entirely for emulator builds (F3's AI calls there use a mocked `AiClient`,
 * see `ai.ts`/`firebase-test-hooks.ts` — never the real Gemini Developer API,
 * so there is nothing for App Check to protect in tests). In dev against the
 * real project, set `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` (see README)
 * to a token registered in the Firebase console, or to any non-empty string
 * to have the SDK mint and log a fresh one on first run — never commit a real
 * token. Enforcement itself is a separate, later step in the Firebase console
 * (plan's "owner steps"): initializing App Check here does not turn it on.
 */
function initAppCheck(app: FirebaseApp): void {
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    (globalThis as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

/**
 * Create an independent client. The app uses the `getFirebase()` singleton;
 * emulator tests create extra named instances to act as a second device.
 */
export function createFirebaseClient(name?: string): FirebaseClient {
  const useEmulators = emulatorsEnabled();
  const config = useEmulators
    ? { ...firebaseConfig, projectId: EMULATOR_PROJECT_ID }
    : firebaseConfig;
  const app = name ? initializeApp(config, name) : initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache:
      typeof window === 'undefined'
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } else if (typeof window !== 'undefined') {
    // Browser only, and never during static-export prerendering in Node.
    initAppCheck(app);
  }
  return { app, auth, db };
}

let client: FirebaseClient | null = null;

/** The app-wide client, created on first use (browser only in practice). */
export function getFirebase(): FirebaseClient {
  if (!client) {
    client = createFirebaseClient();
    if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1' && typeof window !== 'undefined') {
      // Emulator-only e2e hooks (window.__sdtTest); never part of a production bundle.
      const created = client;
      void import('./firebase-test-hooks').then(({ installTestHooks }) =>
        installTestHooks(created)
      );
    }
  }
  return client;
}

/** Drop the singleton after its Firestore was terminated (sign-out). */
export async function resetFirebase(): Promise<void> {
  const current = client;
  client = null;
  if (current) await deleteApp(current.app).catch(() => undefined);
}
