/**
 * Security Rules spec for users/{uid}/summaries/{date} (ADR-009 §2.3/D14/D16,
 * slice 8a): owner-only for now (parent read access is 8b), doc id is a
 * valid IsoDate, document shaped exactly like `buildDaySummary` produces it —
 * known goal keys only, warnings from the allowed set, efficiency 0-100 or
 * null, ratingScore 1-5 or null, no extra fields. Runs on the Firestore
 * emulator via `pnpm test:emulator` (project demo-sdt).
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

const untrackedGoal = { actual: 0, target: null, score: null };

const summary = {
  efficiency: 82,
  goals: {
    sleep: { actual: 370, target: 450, score: 0.82 },
    school: { actual: 300, target: 300, score: 1 },
    extraClass: { actual: 120, target: 120, score: 1 },
    selfStudy: { actual: 90, target: 180, score: 0.5 },
    meals: { actual: 90, target: 90, score: 1 },
    entertainment: { actual: 60, target: 90, score: 1 },
  },
  warnings: ['sleep-short'],
  ratingScore: 4,
  updatedAt: 1_700_000_000_000,
};

const untrackedSummary = {
  efficiency: null,
  goals: {
    sleep: untrackedGoal,
    school: untrackedGoal,
    extraClass: untrackedGoal,
    selfStudy: untrackedGoal,
    meals: untrackedGoal,
    entertainment: untrackedGoal,
  },
  warnings: [],
  ratingScore: null,
  updatedAt: 1_700_000_000_000,
};

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore() as unknown as Firestore, path), data);
  });
}

describe('users/{uid}/summaries/{date}', () => {
  const path = 'users/alice/summaries/2026-10-03';

  it('lets the owner create, read, update and delete their own summary', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), summary));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(setDoc(doc(db, path), { ...summary, efficiency: 50 }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('accepts a fully untracked day (efficiency, every score and ratingScore null)', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), untrackedSummary));
  });

  it('denies another user and unauthenticated access — no parent read yet (8b)', async () => {
    await seed(path, summary);
    await assertFails(getDoc(doc(asUser('bob'), path)));
    await assertFails(setDoc(doc(asUser('bob'), path), summary));
    await assertFails(deleteDoc(doc(asUser('bob'), path)));
    await assertFails(getDoc(doc(anonymous(), path)));
    await assertFails(setDoc(doc(anonymous(), path), summary));
  });

  it('denies a doc id that is not a YYYY-MM-DD date', async () => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, 'users/alice/summaries/not-a-date'), summary));
    await assertFails(setDoc(doc(db, 'users/alice/summaries/2026-1-3'), summary));
  });

  it('denies missing or extra top-level keys', async () => {
    const db = asUser('alice');
    const { warnings: _omit, ...missing } = summary;
    await assertFails(setDoc(doc(db, path), missing));
    await assertFails(setDoc(doc(db, path), { ...summary, extra: true }));
  });

  it('denies an efficiency outside 0-100, including non-integers', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), { ...summary, efficiency: 0 }));
    await assertSucceeds(setDoc(doc(db, path), { ...summary, efficiency: 100 }));
    await assertFails(setDoc(doc(db, path), { ...summary, efficiency: -1 }));
    await assertFails(setDoc(doc(db, path), { ...summary, efficiency: 101 }));
    await assertFails(setDoc(doc(db, path), { ...summary, efficiency: 50.5 }));
  });

  it('denies a ratingScore outside 1-5', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, path), { ...summary, ratingScore: 1 }));
    await assertFails(setDoc(doc(db, path), { ...summary, ratingScore: 0 }));
    await assertFails(setDoc(doc(db, path), { ...summary, ratingScore: 6 }));
  });

  it('denies an unknown goal key or a missing goal', async () => {
    const db = asUser('alice');
    const { sleep: _omit, ...goalsWithoutSleep } = summary.goals;
    await assertFails(setDoc(doc(db, path), { ...summary, goals: goalsWithoutSleep }));
    await assertFails(
      setDoc(doc(db, path), { ...summary, goals: { ...summary.goals, extra: untrackedGoal } })
    );
  });

  it('denies an unknown warning code', async () => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, path), { ...summary, warnings: ['good-day'] }));
  });

  it('denies a goal score outside 0-1 or an out-of-range actual/target', async () => {
    const db = asUser('alice');
    await assertFails(
      setDoc(doc(db, path), {
        ...summary,
        goals: { ...summary.goals, sleep: { ...summary.goals.sleep, score: 1.5 } },
      })
    );
    await assertFails(
      setDoc(doc(db, path), {
        ...summary,
        goals: { ...summary.goals, sleep: { ...summary.goals.sleep, actual: -1 } },
      })
    );
    await assertFails(
      setDoc(doc(db, path), {
        ...summary,
        goals: { ...summary.goals, sleep: { ...summary.goals.sleep, extra: 1 } },
      })
    );
  });
});
