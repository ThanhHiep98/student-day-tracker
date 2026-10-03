/**
 * Security Rules spec (plan §2.4 data model, §2.6 "Rules"): owner-only access
 * to users/{uid}/**, and documents shaped exactly like the app writes them.
 * Runs on the Firestore emulator via `pnpm test:emulator` (project demo-sdt).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
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

const profile = {
  displayName: 'Minh Anh',
  email: 'minhanh@example.com',
  photoURL: null,
  createdAt: 1_700_000_000_000,
  privacyAcceptedAt: 1_700_000_000_000,
};

const activity = {
  id: 'a1',
  categoryId: 'work',
  name: 'Deep work',
  date: '2026-10-01',
  startMinutes: 540,
  endMinutes: 600,
  createdAt: 1_700_000_000_000,
};

const category = {
  id: 'c1',
  name: 'Volunteering',
  color: '#0ea5e9',
  icon: '🏷️',
  isDefault: false,
  createdAt: 1_700_000_000_000,
};

/** Seed data bypassing the rules. */
async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore() as unknown as Firestore, path), data);
  });
}

describe('users/{uid} profile', () => {
  it('lets the owner create, read and update allowed fields', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile));
    await assertSucceeds(getDoc(doc(db, 'users/alice')));
    await assertSucceeds(
      setDoc(doc(db, 'users/alice'), { migratedFromDexieAt: 5 }, { merge: true })
    );
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { displayName: 'Anh', photoURL: 'x' }));
  });

  it('denies another user and unauthenticated access', async () => {
    await seed('users/alice', profile);
    await assertFails(getDoc(doc(asUser('bob'), 'users/alice')));
    await assertFails(setDoc(doc(asUser('bob'), 'users/alice'), profile));
    await assertFails(getDoc(doc(anonymous(), 'users/alice')));
    await assertFails(setDoc(doc(anonymous(), 'users/alice'), profile));
  });

  it('denies a profile with extra or missing keys, or wrong types', async () => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile, role: 'admin' }));
    const { privacyAcceptedAt: _omit, ...missing } = profile;
    await assertFails(setDoc(doc(db, 'users/alice'), missing));
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile, createdAt: 'yesterday' }));
  });

  it('denies changing createdAt, email or privacyAcceptedAt, and deleting the profile', async () => {
    await seed('users/alice', profile);
    const db = asUser('alice');
    await assertFails(updateDoc(doc(db, 'users/alice'), { createdAt: 1 }));
    await assertFails(updateDoc(doc(db, 'users/alice'), { email: 'other@example.com' }));
    await assertFails(updateDoc(doc(db, 'users/alice'), { privacyAcceptedAt: 1 }));
    await assertFails(deleteDoc(doc(db, 'users/alice')));
  });

  it('lets the owner set and withdraw aiConsent (F3, ADR-009 D10/D12)', async () => {
    await seed('users/alice', profile);
    const db = asUser('alice');
    await assertSucceeds(
      setDoc(doc(db, 'users/alice'), { aiConsent: { granted: true, at: 5 } }, { merge: true })
    );
    await assertSucceeds(
      updateDoc(doc(db, 'users/alice'), { aiConsent: { granted: false, at: 6 } })
    );
  });

  it('denies a malformed aiConsent', async () => {
    await seed('users/alice', profile);
    const db = asUser('alice');
    await assertFails(
      setDoc(doc(db, 'users/alice'), { aiConsent: { granted: 'yes', at: 5 } }, { merge: true })
    );
    await assertFails(
      setDoc(doc(db, 'users/alice'), { aiConsent: { granted: true } }, { merge: true })
    );
    await assertFails(
      setDoc(
        doc(db, 'users/alice'),
        { aiConsent: { granted: true, at: 5, extra: true } },
        { merge: true }
      )
    );
  });

  it('denies another user from updating aiConsent', async () => {
    await seed('users/alice', profile);
    await assertFails(
      updateDoc(doc(asUser('bob'), 'users/alice'), { aiConsent: { granted: true, at: 5 } })
    );
  });

  it('denies a migration marker merge when the profile does not exist yet', async () => {
    await assertFails(
      setDoc(doc(asUser('alice'), 'users/alice'), { migratedFromDexieAt: 5 }, { merge: true })
    );
  });
});

describe('users/{uid}/activities/{id}', () => {
  const path = 'users/alice/activities/a1';

  it('lets the owner create, read, list, update and delete', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), activity));
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/activities/s1'), {
        ...activity,
        id: 's1',
        spanId: 's1',
        startMinutes: 1260,
        endMinutes: 1440,
      })
    );
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(getDocs(collection(db, 'users/alice/activities')));
    await assertSucceeds(setDoc(doc(db, path), { ...activity, name: 'Renamed' }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('denies another user and unauthenticated access', async () => {
    await seed(path, activity);
    await assertFails(getDoc(doc(asUser('bob'), path)));
    await assertFails(getDocs(collection(asUser('bob'), 'users/alice/activities')));
    await assertFails(setDoc(doc(asUser('bob'), path), activity));
    await assertFails(deleteDoc(doc(asUser('bob'), path)));
    await assertFails(getDoc(doc(anonymous(), path)));
    await assertFails(setDoc(doc(anonymous(), path), activity));
  });

  it('denies invalid activities', async () => {
    const db = asUser('alice');
    const invalid: Record<string, unknown>[] = [
      { ...activity, endMinutes: 540 }, // end = start
      { ...activity, startMinutes: 600, endMinutes: 540 }, // end < start
      { ...activity, endMinutes: 1441 },
      { ...activity, startMinutes: -1 },
      { ...activity, startMinutes: 1440, endMinutes: 1440 },
      { ...activity, startMinutes: 540.5 },
      { ...activity, date: '1/10/2026' },
      { ...activity, date: '2026-10-1' },
      { ...activity, extra: true },
      { ...activity, id: 'not-the-doc-id' },
      { ...activity, name: '' },
      { ...activity, name: 'x'.repeat(201) },
      { ...activity, categoryId: '' },
      { ...activity, createdAt: 'now' },
      { ...activity, spanId: 42 },
    ];
    for (const data of invalid) {
      await assertFails(setDoc(doc(db, path), data));
    }
    const { name: _omit, ...missingName } = activity;
    await assertFails(setDoc(doc(db, path), missingName));
  });

  it('accepts the name length limit exactly', async () => {
    await assertSucceeds(
      setDoc(doc(asUser('alice'), path), { ...activity, name: 'x'.repeat(200) })
    );
  });
});

describe('users/{uid}/categories/{id}', () => {
  const path = 'users/alice/categories/c1';

  it('lets the owner create, read, update and delete a custom category', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), category));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(setDoc(doc(db, path), { ...category, name: 'Volunteer' }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('denies another user and unauthenticated access', async () => {
    await seed(path, category);
    await assertFails(getDoc(doc(asUser('bob'), path)));
    await assertFails(setDoc(doc(asUser('bob'), path), category));
    await assertFails(getDoc(doc(anonymous(), path)));
  });

  it('denies default (isDefault: true) and malformed categories', async () => {
    const db = asUser('alice');
    const invalid: Record<string, unknown>[] = [
      { ...category, isDefault: true },
      { ...category, color: 'blue' },
      { ...category, color: '#12345' },
      { ...category, name: '' },
      { ...category, name: 'x'.repeat(51) },
      { ...category, id: 'other' },
      { ...category, extra: 1 },
    ];
    for (const data of invalid) {
      await assertFails(setDoc(doc(db, path), data));
    }
  });
});

describe('anything else', () => {
  it('is denied', async () => {
    await assertFails(setDoc(doc(asUser('alice'), 'other/x'), { a: 1 }));
    await assertFails(getDoc(doc(asUser('alice'), 'users/alice/secrets/x')));
  });
});
