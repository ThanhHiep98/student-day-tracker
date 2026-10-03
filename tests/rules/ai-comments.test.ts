/**
 * Security Rules spec for users/{uid}/aiComments/{date} (ADR-009 §2.3 F3):
 * owner-only access (no parent read — slice 8 is a later PR and only ever
 * reads `summaries/{date}`), doc id is a valid IsoDate, document shaped
 * exactly like `buildAiComment` produces it. Runs on the Firestore emulator
 * via `pnpm test:emulator` (project demo-sdt).
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

const comment = {
  text: 'Solid week — school and extra class stayed on plan.',
  model: 'gemini-2.5-flash',
  inputHash: 'abc12345',
  createdAt: 1_700_000_000_000,
};

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore() as unknown as Firestore, path), data);
  });
}

describe('users/{uid}/aiComments/{date}', () => {
  const path = 'users/alice/aiComments/2026-10-03';

  it('lets the owner create, read, update and delete their own cached comment', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), comment));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(setDoc(doc(db, path), { ...comment, text: 'Updated.' }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('denies another user and unauthenticated access — no parent read of AI text', async () => {
    await seed(path, comment);
    await assertFails(getDoc(doc(asUser('bob'), path)));
    await assertFails(setDoc(doc(asUser('bob'), path), comment));
    await assertFails(deleteDoc(doc(asUser('bob'), path)));
    await assertFails(getDoc(doc(anonymous(), path)));
    await assertFails(setDoc(doc(anonymous(), path), comment));
  });

  it('denies a doc id that is not a YYYY-MM-DD date', async () => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, 'users/alice/aiComments/not-a-date'), comment));
  });

  it('denies missing or extra top-level keys', async () => {
    const db = asUser('alice');
    const { text: _omit, ...missing } = comment;
    await assertFails(setDoc(doc(db, path), missing));
    await assertFails(setDoc(doc(db, path), { ...comment, extra: true }));
  });

  it('denies an empty or oversized text, and wrong types', async () => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, path), { ...comment, text: '' }));
    await assertFails(setDoc(doc(db, path), { ...comment, text: 'a'.repeat(2001) }));
    await assertSucceeds(setDoc(doc(db, path), { ...comment, text: 'a'.repeat(2000) }));
    await assertFails(setDoc(doc(db, path), { ...comment, createdAt: 'now' }));
    await assertFails(setDoc(doc(db, path), { ...comment, model: '' }));
  });
});
