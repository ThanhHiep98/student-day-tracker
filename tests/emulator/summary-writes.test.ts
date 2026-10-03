/**
 * Integration: saveDaySummary / summaryDoc against the real modular SDK on
 * the Auth + Firestore emulators (ADR-009 §2.5, slice 8a). Proves the write
 * helper stores exactly `buildDaySummary`'s shape at
 * `users/{uid}/summaries/{date}`, and that a second device on the same
 * account sees an update live.
 */
import { buildDaySummary } from '@/lib/build-day-summary';
import { evaluateDay } from '@/lib/evaluate-day';
import { summaryDoc } from '@/lib/firestore-paths';
import { getDayEfficiency } from '@/lib/get-efficiency';
import { suggestedHabitGoals } from '@/lib/suggested-habit-goals';
import { saveDaySummary } from '@/lib/summary-writes';
import type { DaySummary, HabitGoals } from '@/lib/types';
import { getDocFromServer, onSnapshot, waitForPendingWrites } from 'firebase/firestore';
import { afterEach, describe, expect, it } from 'vitest';
import { type Device, signInDevice, waitFor } from './support';

const devices: Device[] = [];
async function device(sub?: string) {
  const d = await signInDevice(sub);
  devices.push(d);
  return d;
}

afterEach(async () => {
  await Promise.all(devices.splice(0).map((d) => d.close()));
});

const GOALS: HabitGoals = {
  version: 1,
  status: 'completed',
  lastStep: 5,
  ...suggestedHabitGoals(),
  createdAt: 1,
  updatedAt: 1,
};

function summaryFor(date: string, now: Date): DaySummary {
  const evaluation = evaluateDay([], GOALS, date, now);
  const efficiency = getDayEfficiency(evaluation);
  return buildDaySummary(evaluation, efficiency, null, 10);
}

describe('saveDaySummary', () => {
  it('stores the built document at users/{uid}/summaries/{date}', async () => {
    const d = await device();
    const summary = summaryFor('2026-10-03', new Date('2026-10-03T12:00:00'));
    saveDaySummary(d.scope, '2026-10-03', summary);
    await waitForPendingWrites(d.scope.db);

    const stored = await getDocFromServer(summaryDoc(d.scope, '2026-10-03'));
    expect(stored.data()).toEqual(summary);
  });

  it('overwrites the day’s single document on a later save (one summary per day)', async () => {
    const d = await device();
    const first = summaryFor('2026-10-03', new Date('2026-10-03T12:00:00'));
    saveDaySummary(d.scope, '2026-10-03', first);
    await waitForPendingWrites(d.scope.db);

    const second = { ...first, ratingScore: 4, updatedAt: 20 };
    saveDaySummary(d.scope, '2026-10-03', second);
    await waitForPendingWrites(d.scope.db);

    const stored = await getDocFromServer(summaryDoc(d.scope, '2026-10-03'));
    expect(stored.data()).toEqual(second);
  });

  it('a write on one device reaches another device on the same account', async () => {
    const sub = `multi-${Date.now()}`;
    const phone = await device(sub);
    const laptop = await device(sub);

    let seen: DaySummary | undefined;
    const unsubscribe = onSnapshot(summaryDoc(laptop.scope, '2026-10-03'), (snapshot) => {
      seen = snapshot.data();
    });
    const summary = {
      ...summaryFor('2026-10-03', new Date('2026-10-03T12:00:00')),
      ratingScore: 5,
    };
    saveDaySummary(phone.scope, '2026-10-03', summary);
    await waitFor(() => seen?.ratingScore === 5);
    unsubscribe();
  });
});
