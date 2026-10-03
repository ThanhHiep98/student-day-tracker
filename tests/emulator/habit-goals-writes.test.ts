/**
 * Integration: saveHabitGoals / habitGoalsDoc against the real modular SDK on
 * the Auth + Firestore emulators (ADR-008 §2.5/§2.6). Proves the write helper
 * stores exactly buildHabitGoals' shape at users/{uid}/goals/habits, and that
 * a second device signed into the same account sees the update live.
 */
import { buildHabitGoals } from '@/lib/build-habit-goals';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';
import { habitGoalsDoc } from '@/lib/firestore-paths';
import { saveHabitGoals } from '@/lib/habit-goals-writes';
import { suggestedHabitGoals } from '@/lib/suggested-habit-goals';
import type { HabitGoals } from '@/lib/types';
import { getDocFromServer, onSnapshot, waitForPendingWrites } from 'firebase/firestore';
import { afterEach, describe, expect, it } from 'vitest';
import { type Device, signInDevice, waitFor } from './support';

const categories = [...DEFAULT_CATEGORIES];

const devices: Device[] = [];
async function device(sub?: string) {
  const d = await signInDevice(sub);
  devices.push(d);
  return d;
}

afterEach(async () => {
  await Promise.all(devices.splice(0).map((d) => d.close()));
});

describe('saveHabitGoals', () => {
  it('stores the built document at users/{uid}/goals/habits', async () => {
    const d = await device();
    const goals = buildHabitGoals(suggestedHabitGoals(), categories, {
      status: 'in-progress',
      lastStep: 2,
      createdAt: 10,
      updatedAt: 10,
    });
    saveHabitGoals(d.scope, goals);
    await waitForPendingWrites(d.scope.db);

    const stored = await getDocFromServer(habitGoalsDoc(d.scope));
    expect(stored.data()).toEqual(goals);
  });

  it('overwrites the single document on a later save (D8 — no history)', async () => {
    const d = await device();
    const first = buildHabitGoals(suggestedHabitGoals(), categories, {
      status: 'in-progress',
      lastStep: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    saveHabitGoals(d.scope, first);
    await waitForPendingWrites(d.scope.db);

    const completed = buildHabitGoals(suggestedHabitGoals(), categories, {
      status: 'completed',
      lastStep: 5,
      createdAt: 1,
      updatedAt: 2,
      completedAt: 2,
    });
    saveHabitGoals(d.scope, completed);
    await waitForPendingWrites(d.scope.db);

    const stored = await getDocFromServer(habitGoalsDoc(d.scope));
    expect(stored.data()).toEqual(completed);
  });

  it('a write on one device reaches another device on the same account', async () => {
    const sub = `multi-${Date.now()}`;
    const phone = await device(sub);
    const laptop = await device(sub);

    let seen: HabitGoals | undefined;
    const unsubscribe = onSnapshot(habitGoalsDoc(laptop.scope), (snapshot) => {
      seen = snapshot.data();
    });
    const goals = buildHabitGoals(suggestedHabitGoals(), categories, {
      status: 'skipped',
      lastStep: 0,
      createdAt: 1,
      updatedAt: 1,
    });
    saveHabitGoals(phone.scope, goals);
    await waitFor(() => seen?.status === 'skipped');
    unsubscribe();
  });
});
