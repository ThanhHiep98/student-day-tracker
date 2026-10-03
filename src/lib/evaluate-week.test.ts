import { describe, expect, it } from 'vitest';
import { evaluateWeek } from './evaluate-week';
import { suggestedHabitGoals } from './suggested-habit-goals';
import type { Activity, HabitGoals } from './types';

// Monday 2026-09-28 .. Sunday 2026-10-04; "now" is the following Monday, so
// the whole week has ended.
const WEEK_START = '2026-09-28';
const AFTER_WEEK = new Date('2026-10-05T09:00:00');
const WEEKDAYS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
const WEEKEND = ['2026-10-03', '2026-10-04'];

const GOALS: HabitGoals = {
  version: 1,
  status: 'completed',
  lastStep: 5,
  ...suggestedHabitGoals(),
  createdAt: 1,
  updatedAt: 1,
};
// sleep target 450m, bedtime goal 23:00; school Mon-Sat 07:00-11:30 + 13:30-16:30 (450m);
// extraClass 120m; selfStudy 180m; meals 90m; entertainment cap 90m.

let nextId = 0;
function activity(
  partial: Partial<Activity> & Pick<Activity, 'categoryId' | 'date' | 'startMinutes' | 'endMinutes'>
): Activity {
  nextId++;
  return { id: `a${nextId}`, name: 'Activity', createdAt: nextId, ...partial };
}

/** One weekday's worth of activities: sleep, school, extraClass, selfStudy, meals, entertainment. */
function weekdayActivities(
  date: string,
  minutes: {
    sleep: number;
    school: boolean;
    extraClass: number;
    selfStudy: number;
    meals: number;
    entertainment: number;
  }
): Activity[] {
  const rows: Activity[] = [
    activity({ categoryId: 'sleep', date, startMinutes: 0, endMinutes: minutes.sleep }),
  ];
  if (minutes.school) {
    rows.push(
      activity({ categoryId: 'school', date, startMinutes: 420, endMinutes: 690 }),
      activity({ categoryId: 'school', date, startMinutes: 810, endMinutes: 990 })
    );
  }
  let cursor = 1000;
  for (const [categoryId, length] of [
    ['extra-class', minutes.extraClass],
    ['self-study', minutes.selfStudy],
    ['meals', minutes.meals],
    ['entertainment', minutes.entertainment],
  ] as const) {
    if (length > 0) {
      rows.push(activity({ categoryId, date, startMinutes: cursor, endMinutes: cursor + length }));
      cursor += length;
    }
  }
  return rows;
}

describe('evaluateWeek — D7: untracked days excluded from the averages', () => {
  it('only counts weekdays with data, ignoring the untracked weekend and leaving goals at 0 tracked days when nothing was logged', () => {
    const activities = WEEKDAYS.flatMap((date) =>
      weekdayActivities(date, {
        sleep: 378,
        school: true,
        extraClass: 120,
        selfStudy: 112,
        meals: 90,
        entertainment: 100,
      })
    );
    const result = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
    const sleep = result.goals.find((g) => g.key === 'sleep');
    expect(sleep?.trackedDays).toBe(5);
    expect(sleep?.averageActualMinutes).toBe(378);
  });

  it('reports 0 tracked days (and stays "on plan") for a goal with no data at all', () => {
    const result = evaluateWeek([], GOALS, WEEK_START, AFTER_WEEK);
    for (const goal of result.goals) {
      expect(goal).toMatchObject({ trackedDays: 0, averageActualMinutes: null, onPlan: true });
    }
  });

  it("excludes days that haven't ended yet (today or later) even when they have data", () => {
    const now = new Date('2026-09-30T12:00:00'); // Wednesday mid-week
    const activities = WEEKDAYS.flatMap((date) =>
      weekdayActivities(date, {
        sleep: 450,
        school: true,
        extraClass: 120,
        selfStudy: 180,
        meals: 90,
        entertainment: 50,
      })
    );
    const result = evaluateWeek(activities, GOALS, WEEK_START, now);
    // Mon, Tue ended; Wed is "today" and excluded; Thu, Fri are in the future and untracked anyway.
    const sleep = result.goals.find((g) => g.key === 'sleep');
    expect(sleep?.trackedDays).toBe(2);
  });
});

describe('evaluateWeek — per-goal averages and status counts', () => {
  const activities = WEEKDAYS.flatMap((date, i) =>
    weekdayActivities(date, {
      sleep: 378,
      school: true,
      extraClass: 120,
      selfStudy: 112,
      meals: 90,
      entertainment: [100, 50, 120, 80, 95][i], // over cap (90) on 3 of 5 days
    })
  );
  const result = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);

  it('averages sleep minutes and exposes the target for the sleep comment', () => {
    expect(result.goals.find((g) => g.key === 'sleep')).toMatchObject({
      averageActualMinutes: 378,
      targetMinutes: 450,
      onPlan: false,
      overCount: 5,
    });
  });

  it("rounds self-study's percent of target", () => {
    expect(result.goals.find((g) => g.key === 'selfStudy')).toMatchObject({
      percentOfTarget: 62, // 112 / 180
      onPlan: false,
    });
  });

  it('counts the days entertainment went over its cap', () => {
    expect(result.goals.find((g) => g.key === 'entertainment')).toMatchObject({
      isCap: true,
      overCount: 3,
      trackedDays: 5,
      onPlan: false,
    });
  });

  it('keeps school and extra class on plan when every day met the block/target minutes', () => {
    expect(result.goals.find((g) => g.key === 'school')).toMatchObject({
      onPlan: true,
      overCount: 0,
    });
    expect(result.goals.find((g) => g.key === 'extraClass')).toMatchObject({
      onPlan: true,
      overCount: 0,
    });
  });
});

describe('evaluateWeek — bedtime aggregation', () => {
  it('counts nights later than the D4 tolerance out of the nights with a sleep span', () => {
    // Offsets from the 23:00 goal: +40 (warn), 0 (ok), +70 (warn, 00:10), 0 (ok), +120 (warn, 01:00).
    const bedtimes = [1420, 1380, 10, 1380, 60];
    const activities = WEEKDAYS.flatMap((date, i) => [
      activity({ categoryId: 'sleep', date, startMinutes: bedtimes[i], endMinutes: 1430 }),
    ]);
    const result = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
    expect(result.bedtimeTrackedDays).toBe(5);
    expect(result.bedtimeLateDays).toBe(3);
  });

  it('is 0/0 with no sleep data', () => {
    const result = evaluateWeek([], GOALS, WEEK_START, AFTER_WEEK);
    expect(result).toMatchObject({ bedtimeTrackedDays: 0, bedtimeLateDays: 0 });
  });
});

describe('evaluateWeek — days array', () => {
  it('returns exactly the 7 days of the week, Mon..Sun, in order', () => {
    const result = evaluateWeek([], GOALS, WEEK_START, AFTER_WEEK);
    expect(result.days.map((d) => d.date)).toEqual([...WEEKDAYS, ...WEEKEND]);
  });
});
