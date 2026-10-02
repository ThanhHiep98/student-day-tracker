import { randomUUID } from 'node:crypto';
import { type FirebaseClient, createFirebaseClient } from '@/lib/firebase';
import type { UserScope } from '@/lib/firestore-paths';
import { deleteApp } from 'firebase/app';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { terminate } from 'firebase/firestore';

/**
 * Emulator test helpers: each call creates an independent SDK instance (one
 * "device") signed in through the Auth emulator with a fake Google credential.
 * The same `sub` on two devices resolves to the same Firebase uid.
 */
export interface Device {
  client: FirebaseClient;
  scope: UserScope;
  close(): Promise<void>;
}

export async function signInDevice(sub: string = randomUUID()): Promise<Device> {
  const client = createFirebaseClient(`device-${randomUUID()}`);
  const credential = GoogleAuthProvider.credential(
    JSON.stringify({ sub, email: `${sub}@example.com`, email_verified: true, name: 'Minh Anh' })
  );
  const { user } = await signInWithCredential(client.auth, credential);
  return {
    client,
    scope: { db: client.db, uid: user.uid },
    async close() {
      await terminate(client.db);
      await deleteApp(client.app);
    },
  };
}

/** Resolve when `predicate` holds, polling every 50 ms (default 10 s). */
export async function waitFor(predicate: () => boolean, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
