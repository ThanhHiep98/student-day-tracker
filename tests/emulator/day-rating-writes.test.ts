/**
 * Integration: saveDayRating / dayRatingDoc against the real modular SDK on
 * the Auth + Firestore emulators (ADR-009 §2.5). Proves the write helper
 * stores exactly buildDayRating's shape at users/{uid}/dayRatings/{date}, the
 * range query used by the rating trend, and that a second device on the same
 * account sees an update live.
 */
import { buildDayRating } from '@/lib/build-day-rating';
import { saveDayRating } from '@/lib/day-rating-writes';
import { dayRatingDoc, dayRatingsCol } from '@/lib/firestore-paths';
import type { DayRating } from '@/lib/types';
import {
  documentId,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  waitForPendingWrites,
  where,
} from 'firebase/firestore';
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

describe('saveDayRating', () => {
  it('stores the built document at users/{uid}/dayRatings/{date}', async () => {
    const d = await device();
    const rating = buildDayRating(
      { date: '2026-10-03', score: 4, note: 'Kiểm tra Toán ổn.' },
      { updatedAt: 10 },
      '2026-10-03'
    );
    saveDayRating(d.scope, '2026-10-03', rating);
    await waitForPendingWrites(d.scope.db);

    const stored = await getDocFromServer(dayRatingDoc(d.scope, '2026-10-03'));
    expect(stored.data()).toEqual(rating);
  });

  it('overwrites the day’s single document on a later save (one rating per day)', async () => {
    const d = await device();
    const first = buildDayRating({ date: '2026-10-03', score: 2 }, { updatedAt: 1 }, '2026-10-03');
    saveDayRating(d.scope, '2026-10-03', first);
    await waitForPendingWrites(d.scope.db);

    const second = buildDayRating(
      { date: '2026-10-03', score: 5, note: 'Better after all' },
      { updatedAt: 2 },
      '2026-10-03'
    );
    saveDayRating(d.scope, '2026-10-03', second);
    await waitForPendingWrites(d.scope.db);

    const stored = await getDocFromServer(dayRatingDoc(d.scope, '2026-10-03'));
    expect(stored.data()).toEqual(second);
  });

  it('a write on one device reaches another device on the same account', async () => {
    const sub = `multi-${Date.now()}`;
    const phone = await device(sub);
    const laptop = await device(sub);

    let seen: DayRating | undefined;
    const unsubscribe = onSnapshot(dayRatingDoc(laptop.scope, '2026-10-03'), (snapshot) => {
      seen = snapshot.data();
    });
    const rating = buildDayRating({ date: '2026-10-03', score: 5 }, { updatedAt: 1 }, '2026-10-03');
    saveDayRating(phone.scope, '2026-10-03', rating);
    await waitFor(() => seen?.score === 5);
    unsubscribe();
  });

  it('a documentId() range query returns only the dates within bounds', async () => {
    const d = await device();
    for (const date of ['2026-09-30', '2026-10-01', '2026-10-05']) {
      saveDayRating(
        d.scope,
        date,
        buildDayRating({ date, score: 3 }, { updatedAt: 1 }, '2026-10-05')
      );
    }
    await waitForPendingWrites(d.scope.db);

    const snapshot = await getDocsFromServer(
      query(
        dayRatingsCol(d.scope),
        where(documentId(), '>=', '2026-09-28'),
        where(documentId(), '<=', '2026-10-04')
      )
    );
    expect(snapshot.docs.map((doc) => doc.id).sort()).toEqual(['2026-09-30', '2026-10-01']);
  });
});
