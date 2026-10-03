/**
 * Security Rules spec for users/{uid}/dayRatings/{date} (ADR-009 §2.3):
 * owner-only access, doc id is a valid IsoDate, and the document is shaped
 * exactly like buildDayRating produces it. Runs on the Firestore emulator via
 * `pnpm test:emulator` (project demo-sdt).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { type Firestore, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sdt',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const asUser = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const anonymous = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

const rating = { score: 4, updatedAt: 1_700_000_000_000 };

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore() as unknown as Firestore, path), data);
  });
}

describe('users/{uid}/dayRatings/{date}', () => {
  const path = 'users/alice/dayRatings/2026-10-03';

  it('lets the owner create, read, update and delete their own rating', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), rating));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(setDoc(doc(db, path), { ...rating, score: 2 }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('accepts an optional note up to 280 characters', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), { ...rating, note: 'Kiểm tra Toán ổn.' }));
    await assertSucceeds(setDoc(doc(db, path), { ...rating, note: 'a'.repeat(280) }));
    await assertFails(setDoc(doc(db, path), { ...rating, note: 'a'.repeat(281) }));
  });

  it('denies another user and unauthenticated access', async () => {
    await seed(path, rating);
    await assertFails(getDoc(doc(asUser('bob'), path)));
    await assertFails(setDoc(doc(asUser('bob'), path), rating));
    await assertFails(deleteDoc(doc(asUser('bob'), path)));
    await assertFails(getDoc(doc(anonymous(), path)));
    await assertFails(setDoc(doc(anonymous(), path), rating));
  });

  it('denies a doc id that is not a YYYY-MM-DD date', async () => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, 'users/alice/dayRatings/not-a-date'), rating));
    await assertFails(setDoc(doc(db, 'users/alice/dayRatings/2026-1-3'), rating));
  });

  it('denies missing or extra top-level keys', async () => {
    const db = asUser('alice');
    const { score: _omit, ...missing } = rating;
    await assertFails(setDoc(doc(db, path), missing));
    await assertFails(setDoc(doc(db, path), { ...rating, extra: true }));
  });

  it('denies a score outside 1-5, including non-integers', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), { ...rating, score: 1 }));
    await assertSucceeds(setDoc(doc(db, path), { ...rating, score: 5 }));
    await assertFails(setDoc(doc(db, path), { ...rating, score: 0 }));
    await assertFails(setDoc(doc(db, path), { ...rating, score: 6 }));
    await assertFails(setDoc(doc(db, path), { ...rating, score: 3.5 }));
  });
});
