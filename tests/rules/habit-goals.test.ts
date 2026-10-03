/**
 * Security Rules spec for users/{uid}/goals/habits (ADR-008 §2.3/§2.6):
 * owner-only access, and documents shaped exactly like buildHabitGoals
 * produces them. Runs on the Firestore emulator via `pnpm test:emulator`
 * (project demo-sdt).
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

const goals = {
  version: 1,
  status: 'completed',
  lastStep: 5,
  sleep: { targetMinutes: 450, bedtimeMinutes: 1380, categoryId: 'sleep' },
  school: {
    days: [1, 2, 3, 4, 5, 6],
    blocks: [
      { startMinutes: 420, endMinutes: 690 },
      { startMinutes: 810, endMinutes: 990 },
    ],
    categoryId: 'school',
  },
  extraClass: { targetMinutesPerDay: 120, categoryId: 'extra-class' },
  selfStudy: { targetMinutesPerDay: 180, categoryId: 'self-study' },
  meals: { targetMinutesPerDay: 90, categoryId: 'meals' },
  entertainment: { maxMinutesPerDay: 90, categoryId: 'entertainment' },
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore() as unknown as Firestore, path), data);
  });
}

describe('users/{uid}/goals/habits', () => {
  const path = 'users/alice/goals/habits';

  it('lets the owner create, read, update and delete the one habits document', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), goals));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(setDoc(doc(db, path), { ...goals, status: 'in-progress', lastStep: 2 }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('accepts a completedAt timestamp and an entertainment cap of null (no limit)', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), { ...goals, completedAt: 1_700_000_001_000 }));
    await assertSucceeds(
      setDoc(doc(db, path), {
        ...goals,
        entertainment: { ...goals.entertainment, maxMinutesPerDay: null },
      })
    );
  });

  it('denies another user and unauthenticated access', async () => {
    await seed(path, goals);
    await assertFails(getDoc(doc(asUser('bob'), path)));
    await assertFails(setDoc(doc(asUser('bob'), path), goals));
    await assertFails(deleteDoc(doc(asUser('bob'), path)));
    await assertFails(getDoc(doc(anonymous(), path)));
    await assertFails(setDoc(doc(anonymous(), path), goals));
  });

  it('denies writing to any other doc id under goals/', async () => {
    await assertFails(setDoc(doc(asUser('alice'), 'users/alice/goals/other'), goals));
  });

  it('denies missing or extra top-level keys, and a bad status/lastStep', async () => {
    const db = asUser('alice');
    const { version: _omit, ...missing } = goals;
    await assertFails(setDoc(doc(db, path), missing));
    await assertFails(setDoc(doc(db, path), { ...goals, extra: true }));
    await assertFails(setDoc(doc(db, path), { ...goals, version: 2 }));
    await assertFails(setDoc(doc(db, path), { ...goals, status: 'done' }));
    await assertFails(setDoc(doc(db, path), { ...goals, lastStep: 6 }));
    await assertFails(setDoc(doc(db, path), { ...goals, lastStep: -1 }));
  });

  // Base with everything else minimal, so pushing sleep to its own boundary
  // doesn't also trip the unrelated "planned total <= 24h" rule.
  const minimal = {
    ...goals,
    school: { ...goals.school, blocks: [] },
    extraClass: { ...goals.extraClass, targetMinutesPerDay: 0 },
    selfStudy: { ...goals.selfStudy, targetMinutesPerDay: 0 },
    meals: { ...goals.meals, targetMinutesPerDay: 15 },
  };

  it('denies sleep outside 4-12h (boundary -1/+0)', async () => {
    const db = asUser('alice');
    await assertSucceeds(
      setDoc(doc(db, path), { ...minimal, sleep: { ...minimal.sleep, targetMinutes: 240 } })
    );
    await assertSucceeds(
      setDoc(doc(db, path), { ...minimal, sleep: { ...minimal.sleep, targetMinutes: 720 } })
    );
    await assertFails(
      setDoc(doc(db, path), { ...minimal, sleep: { ...minimal.sleep, targetMinutes: 239 } })
    );
    await assertFails(
      setDoc(doc(db, path), { ...minimal, sleep: { ...minimal.sleep, targetMinutes: 721 } })
    );
  });

  it('denies meals outside 15m-4h (boundary -1/+0)', async () => {
    const db = asUser('alice');
    await assertSucceeds(
      setDoc(doc(db, path), { ...goals, meals: { ...goals.meals, targetMinutesPerDay: 15 } })
    );
    await assertFails(
      setDoc(doc(db, path), { ...goals, meals: { ...goals.meals, targetMinutesPerDay: 14 } })
    );
    await assertFails(
      setDoc(doc(db, path), { ...goals, meals: { ...goals.meals, targetMinutesPerDay: 241 } })
    );
  });

  it('denies extraClass > 8h, selfStudy > 10h, entertainment > 12h', async () => {
    const db = asUser('alice');
    await assertFails(
      setDoc(doc(db, path), {
        ...goals,
        extraClass: { ...goals.extraClass, targetMinutesPerDay: 481 },
      })
    );
    await assertFails(
      setDoc(doc(db, path), {
        ...goals,
        selfStudy: { ...goals.selfStudy, targetMinutesPerDay: 601 },
      })
    );
    await assertFails(
      setDoc(doc(db, path), {
        ...goals,
        entertainment: { ...goals.entertainment, maxMinutesPerDay: 721 },
      })
    );
  });

  it('denies a school block outside 05:00-22:00, end<=start, or a 3rd block', async () => {
    const db = asUser('alice');
    await assertFails(
      setDoc(doc(db, path), {
        ...goals,
        school: { ...goals.school, blocks: [{ startMinutes: 299, endMinutes: 600 }] },
      })
    );
    await assertFails(
      setDoc(doc(db, path), {
        ...goals,
        school: { ...goals.school, blocks: [{ startMinutes: 600, endMinutes: 1321 }] },
      })
    );
    await assertFails(
      setDoc(doc(db, path), {
        ...goals,
        school: { ...goals.school, blocks: [{ startMinutes: 600, endMinutes: 600 }] },
      })
    );
    await assertFails(
      setDoc(doc(db, path), {
        ...goals,
        school: {
          ...goals.school,
          blocks: [
            { startMinutes: 300, endMinutes: 400 },
            { startMinutes: 400, endMinutes: 500 },
            { startMinutes: 500, endMinutes: 600 },
          ],
        },
      })
    );
    await assertFails(setDoc(doc(db, path), { ...goals, school: { ...goals.school, days: [0] } }));
  });

  it('denies a planned total (excl. entertainment) over 24h', async () => {
    const db = asUser('alice');
    const overloaded = {
      ...goals,
      sleep: { ...goals.sleep, targetMinutes: 720 },
      extraClass: { ...goals.extraClass, targetMinutesPerDay: 480 },
      selfStudy: { ...goals.selfStudy, targetMinutesPerDay: 600 },
      meals: { ...goals.meals, targetMinutesPerDay: 240 },
    };
    await assertFails(setDoc(doc(db, path), overloaded));
  });
});
