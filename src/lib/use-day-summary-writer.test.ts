import { renderHook } from '@testing-library/react';
import type { Firestore } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserScope } from './firestore-paths';
import { suggestedHabitGoals } from './suggested-habit-goals';
import type { Activity, HabitGoals } from './types';
import { SUMMARY_WRITE_DEBOUNCE_MS, useDaySummaryWriter } from './use-day-summary-writer';

vi.mock('./summary-writes', () => ({ saveDaySummary: vi.fn() }));
const { saveDaySummary } = await import('./summary-writes');
const saveDaySummaryMock = vi.mocked(saveDaySummary);

/**
 * ADR-009 §2.1/§2.5 D16 slice 8a — `useDaySummaryWriter` only decides *when*
 * `saveDaySummary` is called; `build-day-summary.test.ts` already covers the
 * shape of what gets written, so these tests focus on the gating/debounce.
 */

const SCOPE: UserScope = { db: {} as Firestore, uid: 'alice' };
const GOALS: HabitGoals = {
  version: 1,
  status: 'completed',
  lastStep: 5,
  ...suggestedHabitGoals(),
  createdAt: 1,
  updatedAt: 1,
};
const NOW = new Date('2026-10-03T20:00:00');

function activity(
  partial: Partial<Activity> & Pick<Activity, 'categoryId' | 'date' | 'startMinutes' | 'endMinutes'>
): Activity {
  return { id: 'a1', name: 'Self-study', createdAt: 1, ...partial };
}

const ACTIVITIES: Activity[] = [
  activity({ categoryId: 'self-study', date: '2026-10-03', startMinutes: 600, endMinutes: 700 }),
];
const RATINGS = [{ date: '2026-10-03', score: 4 }];

beforeEach(() => {
  vi.useFakeTimers();
  saveDaySummaryMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDaySummaryWriter — gating (D16)', () => {
  it('never writes while disabled, even once data is ready', () => {
    renderHook(() =>
      useDaySummaryWriter({
        scope: SCOPE,
        enabled: false,
        dates: ['2026-10-03'],
        activities: ACTIVITIES,
        goals: GOALS,
        ratings: RATINGS,
        now: NOW,
      })
    );
    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS * 2);
    expect(saveDaySummaryMock).not.toHaveBeenCalled();
  });

  it('never writes without a signed-in scope', () => {
    renderHook(() =>
      useDaySummaryWriter({
        scope: null,
        enabled: true,
        dates: ['2026-10-03'],
        activities: ACTIVITIES,
        goals: GOALS,
        ratings: RATINGS,
        now: NOW,
      })
    );
    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS * 2);
    expect(saveDaySummaryMock).not.toHaveBeenCalled();
  });

  it('never writes while activities/goals/ratings are still loading', () => {
    renderHook(() =>
      useDaySummaryWriter({
        scope: SCOPE,
        enabled: true,
        dates: ['2026-10-03'],
        activities: undefined,
        goals: GOALS,
        ratings: RATINGS,
        now: NOW,
      })
    );
    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS * 2);
    expect(saveDaySummaryMock).not.toHaveBeenCalled();
  });

  it('never writes for an account that never completed onboarding (goals === null)', () => {
    renderHook(() =>
      useDaySummaryWriter({
        scope: SCOPE,
        enabled: true,
        dates: ['2026-10-03'],
        activities: ACTIVITIES,
        goals: null,
        ratings: RATINGS,
        now: NOW,
      })
    );
    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS * 2);
    expect(saveDaySummaryMock).not.toHaveBeenCalled();
  });
});

describe('useDaySummaryWriter — debounced upsert', () => {
  it('writes one summary per date, only after the debounce delay', () => {
    renderHook(() =>
      useDaySummaryWriter({
        scope: SCOPE,
        enabled: true,
        dates: ['2026-10-02', '2026-10-03'],
        activities: ACTIVITIES,
        goals: GOALS,
        ratings: RATINGS,
        now: NOW,
      })
    );
    expect(saveDaySummaryMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS);
    expect(saveDaySummaryMock).toHaveBeenCalledTimes(2);
    expect(saveDaySummaryMock.mock.calls.map((c) => c[1]).sort()).toEqual([
      '2026-10-02',
      '2026-10-03',
    ]);
    const [scope, date, summary] = saveDaySummaryMock.mock.calls[0];
    expect(scope).toBe(SCOPE);
    expect(date).toBe('2026-10-02');
    expect(summary).toMatchObject({ ratingScore: null }); // not in RATINGS
  });

  it('collapses rapid re-renders within the debounce window into a single write', () => {
    const { rerender } = renderHook(
      (props: { activities: Activity[] }) =>
        useDaySummaryWriter({
          scope: SCOPE,
          enabled: true,
          dates: ['2026-10-03'],
          activities: props.activities,
          goals: GOALS,
          ratings: RATINGS,
          now: NOW,
        }),
      { initialProps: { activities: ACTIVITIES } }
    );

    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS / 2);
    rerender({ activities: [...ACTIVITIES] }); // a new activity logged, new array reference
    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS / 2);
    expect(saveDaySummaryMock).not.toHaveBeenCalled(); // first timer was cancelled

    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS / 2);
    expect(saveDaySummaryMock).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending write on unmount', () => {
    const { unmount } = renderHook(() =>
      useDaySummaryWriter({
        scope: SCOPE,
        enabled: true,
        dates: ['2026-10-03'],
        activities: ACTIVITIES,
        goals: GOALS,
        ratings: RATINGS,
        now: NOW,
      })
    );
    unmount();
    vi.advanceTimersByTime(SUMMARY_WRITE_DEBOUNCE_MS * 2);
    expect(saveDaySummaryMock).not.toHaveBeenCalled();
  });
});
