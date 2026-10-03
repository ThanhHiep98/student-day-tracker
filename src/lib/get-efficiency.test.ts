import { describe, expect, it } from 'vitest';
import { evaluateDay } from './evaluate-day';
import { evaluateWeek } from './evaluate-week';
import { getDayEfficiency, getWeekEfficiency } from './get-efficiency';
import { suggestedHabitGoals } from './suggested-habit-goals';
import type { Activity, HabitGoals } from './types';

/**
 * ADR-009 §2.2 D6 ("% hiệu quả" formula) + D7 (untracked days). Reuses the
 * same `GOALS` baseline as evaluate-day.test.ts/evaluate-week.test.ts: sleep
 * target 7h30m (450m); school Mon-Sat, blocks total 450m (07:00-11:30 +
 * 13:30-16:30); extraClass target 120m; selfStudy target 180m; meals target
 * 90m; entertainment cap 90m.
 */

const TODAY = '2026-10-03'; // Saturday — a school day
const SUNDAY = '2026-10-04'; // not a school day
const NOW_AFTER = new Date('2026-10-05T09:00:00'); // both days ended

const GOALS: HabitGoals = {
  version: 1,
  status: 'completed',
  lastStep: 5,
  ...suggestedHabitGoals(),
  createdAt: 1,
  updatedAt: 1,
};

let nextId = 0;
function activity(
  partial: Partial<Activity> & Pick<Activity, 'categoryId' | 'date' | 'startMinutes' | 'endMinutes'>
): Activity {
  nextId++;
  return { id: `a${nextId}`, name: 'Activity', createdAt: nextId, ...partial };
}

describe('getDayEfficiency — D7 untracked days', () => {
  it('is null (and goals carry zero actuals) when nothing was logged at all', () => {
    const evaluation = evaluateDay([], GOALS, TODAY, NOW_AFTER);
    const result = getDayEfficiency(evaluation);
    expect(result.percent).toBeNull();
    expect(result.goals.every((g) => g.actualMinutes === 0)).toBe(true);
  });
});

describe('getDayEfficiency — target goals: min(actual/target, 1)', () => {
  it('scores a target goal below its target as the raw ratio', () => {
    const activities = [
      activity({ categoryId: 'self-study', date: TODAY, startMinutes: 0, endMinutes: 90 }), // 90/180
    ];
    const evaluation = evaluateDay(activities, GOALS, TODAY, NOW_AFTER);
    const result = getDayEfficiency(evaluation);
    const selfStudy = result.goals.find((g) => g.key === 'selfStudy');
    expect(selfStudy).toMatchObject({ actualMinutes: 90, targetMinutes: 180, score: 0.5 });
  });

  it('caps a target goal at score 1 when actual exceeds the target', () => {
    const activities = [
      activity({ categoryId: 'self-study', date: TODAY, startMinutes: 0, endMinutes: 240 }), // 240/180
    ];
    const evaluation = evaluateDay(activities, GOALS, TODAY, NOW_AFTER);
    const selfStudy = getDayEfficiency(evaluation).goals.find((g) => g.key === 'selfStudy');
    expect(selfStudy).toMatchObject({ actualMinutes: 240, targetMinutes: 180, score: 1 });
  });

  it('scores sleep the same way (a target, not a cap)', () => {
    const activities = [
      activity({ categoryId: 'sleep', date: TODAY, startMinutes: 0, endMinutes: 225 }), // 225/450 = 0.5
    ];
    const evaluation = evaluateDay(activities, GOALS, TODAY, NOW_AFTER);
    const sleep = getDayEfficiency(evaluation).goals.find((g) => g.key === 'sleep');
    expect(sleep).toMatchObject({ score: 0.5 });
  });
});

describe('getDayEfficiency — school: logged minutes within blocks ÷ planned, school days only', () => {
  it('scores school from time actually inside its blocks, ignoring time outside them', () => {
    const activities = [
      // 07:00-10:30 (210m inside the 07:00-11:30 block) + 09:00-09:30 outside any block window below.
      activity({ categoryId: 'school', date: TODAY, startMinutes: 420, endMinutes: 630 }), // 210m
    ];
    const evaluation = evaluateDay(activities, GOALS, TODAY, NOW_AFTER);
    const school = getDayEfficiency(evaluation).goals.find((g) => g.key === 'school');
    // 210 / 450 (total block minutes) ≈ 0.4667
    expect(school?.actualMinutes).toBe(210);
    expect(school?.targetMinutes).toBe(450);
    expect(school?.score).toBeCloseTo(210 / 450, 5);
  });

  it('does not appear at all on a non-school day (excluded from the day average, D6)', () => {
    const evaluation = evaluateDay(
      [activity({ categoryId: 'extra-class', date: SUNDAY, startMinutes: 0, endMinutes: 120 })],
      GOALS,
      SUNDAY,
      NOW_AFTER
    );
    const result = getDayEfficiency(evaluation);
    expect(result.goals.find((g) => g.key === 'school')).toBeUndefined();
    // extraClass met exactly -> score 1, the only applicable goal that day among
    // the ones with data; percent = 100 only if entertainment/meals/sleep have
    // no target to score against — assert school specifically is absent instead
    // of asserting the whole percent, which also depends on sleep/meals/entertainment.
  });
});

describe('getDayEfficiency — entertainment cap formula', () => {
  it('scores 1 when at or under the cap', () => {
    const activities = [
      activity({ categoryId: 'entertainment', date: TODAY, startMinutes: 0, endMinutes: 90 }),
    ];
    const evaluation = evaluateDay(activities, GOALS, TODAY, NOW_AFTER);
    const entertainment = getDayEfficiency(evaluation).goals.find((g) => g.key === 'entertainment');
    expect(entertainment).toMatchObject({ actualMinutes: 90, targetMinutes: 90, score: 1 });
  });

  it('scores max(0, 1 - (actual - cap) / cap) once over the cap', () => {
    // cap 90, actual 135 -> 1 - (135-90)/90 = 1 - 0.5 = 0.5
    const activities = [
      activity({ categoryId: 'entertainment', date: TODAY, startMinutes: 0, endMinutes: 135 }),
    ];
    const evaluation = evaluateDay(activities, GOALS, TODAY, NOW_AFTER);
    const entertainment = getDayEfficiency(evaluation).goals.find((g) => g.key === 'entertainment');
    expect(entertainment?.score).toBeCloseTo(0.5, 5);
  });

  it('clamps the cap score at 0 rather than going negative when wildly over', () => {
    // cap 90, actual 300 -> 1 - (300-90)/90 = 1 - 2.33 = -1.33 -> clamped to 0
    const activities = [
      activity({ categoryId: 'entertainment', date: TODAY, startMinutes: 0, endMinutes: 300 }),
    ];
    const evaluation = evaluateDay(activities, GOALS, TODAY, NOW_AFTER);
    const entertainment = getDayEfficiency(evaluation).goals.find((g) => g.key === 'entertainment');
    expect(entertainment?.score).toBe(0);
  });

  it('excludes entertainment from the day average when the student set "no limit" (cap = null)', () => {
    const noCapGoals: HabitGoals = {
      ...GOALS,
      entertainment: { maxMinutesPerDay: null, categoryId: 'entertainment' },
    };
    const activities = [
      activity({ categoryId: 'self-study', date: TODAY, startMinutes: 0, endMinutes: 180 }), // score 1
      activity({ categoryId: 'entertainment', date: TODAY, startMinutes: 200, endMinutes: 400 }),
    ];
    const evaluation = evaluateDay(activities, noCapGoals, TODAY, NOW_AFTER);
    const result = getDayEfficiency(evaluation);
    const entertainment = result.goals.find((g) => g.key === 'entertainment');
    expect(entertainment).toMatchObject({ targetMinutes: null, score: null });
  });
});

describe('getDayEfficiency — day % = mean over the goals that apply that day', () => {
  it('averages only the scored goals and rounds to the nearest integer', () => {
    // selfStudy 90/180 = 0.5; entertainment 90/90 = 1; everything else untouched
    // (sleep 0/450=0, extraClass 0/120=0, meals 0/90=0, school applies on
    // Saturday with 0/450=0) -> mean of [0, 0, 0, 0.5, 0, 1] over 6 goals = 0.25 -> 25%.
    const activities = [
      activity({ categoryId: 'self-study', date: TODAY, startMinutes: 0, endMinutes: 90 }),
      activity({ categoryId: 'entertainment', date: TODAY, startMinutes: 100, endMinutes: 190 }),
    ];
    const evaluation = evaluateDay(activities, GOALS, TODAY, NOW_AFTER);
    const result = getDayEfficiency(evaluation);
    expect(result.percent).toBe(25);
  });

  it('rounds half up', () => {
    // Two goals only matter: a single target goal scored at exactly 0.625 -> 62.5% -> rounds to 63.
    const halfGoals: HabitGoals = {
      ...GOALS,
      school: { ...GOALS.school, days: [] }, // remove school so it never applies
      extraClass: { targetMinutesPerDay: 0, categoryId: 'extra-class' },
      meals: { targetMinutesPerDay: 0, categoryId: 'meals' },
      entertainment: { maxMinutesPerDay: null, categoryId: 'entertainment' },
      sleep: { ...GOALS.sleep, targetMinutes: 0 },
    };
    // Only selfStudy has a real target now; a 0-target goal trivially scores 1 (D6 edge case).
    const activities = [
      activity({ categoryId: 'self-study', date: TODAY, startMinutes: 0, endMinutes: 100 }), // 100/180
    ];
    const evaluation = evaluateDay(activities, halfGoals, TODAY, NOW_AFTER);
    const result = getDayEfficiency(evaluation);
    // sleep(1) + extraClass(1) + selfStudy(100/180=0.5556) + meals(1) = mean 0.8889 -> 89%
    expect(result.percent).toBe(89);
  });
});

describe('getWeekEfficiency — D7 untracked/not-yet-ended days show as "–" (null)', () => {
  const WEEK_START = '2026-09-28'; // Monday

  it('excludes untracked and not-yet-ended days from the daily bars and the average', () => {
    const activities = [
      activity({ categoryId: 'self-study', date: '2026-09-28', startMinutes: 0, endMinutes: 180 }),
    ];
    const week = evaluateWeek(activities, GOALS, WEEK_START, new Date('2026-09-29T09:00:00'));
    // Mon (28th) ended and tracked; Tue (29th) is "today" so excluded even though
    // evaluateWeek still returns a DayEvaluation for it; the rest are untracked.
    const result = getWeekEfficiency(week);
    const mon = result.days.find((d) => d.date === '2026-09-28');
    const tue = result.days.find((d) => d.date === '2026-09-29');
    const wed = result.days.find((d) => d.date === '2026-09-30');
    expect(mon?.percent).not.toBeNull();
    expect(tue?.percent).toBeNull();
    expect(wed?.percent).toBeNull();
  });

  it('is null overall with no tracked days', () => {
    const week = evaluateWeek([], GOALS, WEEK_START, new Date('2026-10-05T09:00:00'));
    const result = getWeekEfficiency(week);
    expect(result.average).toBeNull();
    expect(result.days.every((d) => d.percent === null)).toBe(true);
  });
});

describe('getWeekEfficiency — week % = mean of tracked days', () => {
  const WEEK_START = '2026-09-28'; // Mon
  const AFTER_WEEK = new Date('2026-10-05T09:00:00');
  const WEEKDAYS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];

  it('averages the per-day percentages, not the per-goal scores directly', () => {
    const activities = WEEKDAYS.flatMap((date) => [
      activity({ categoryId: 'self-study', date, startMinutes: 0, endMinutes: 180 }), // full target every day
    ]);
    const week = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
    const result = getWeekEfficiency(week);
    const trackedPercents = result.days
      .map((d) => d.percent)
      .filter((p): p is number => p !== null);
    expect(trackedPercents).toHaveLength(5);
    const expectedAverage = Math.round(
      trackedPercents.reduce((a, b) => a + b, 0) / trackedPercents.length
    );
    expect(result.average).toBe(expectedAverage);
  });
});

describe('getWeekEfficiency — six per-goal bars with short notes', () => {
  const WEEK_START = '2026-09-28';
  const AFTER_WEEK = new Date('2026-10-05T09:00:00');
  const WEEKDAYS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];

  it('returns exactly the 6 goals in canonical order', () => {
    const week = evaluateWeek([], GOALS, WEEK_START, AFTER_WEEK);
    const result = getWeekEfficiency(week);
    expect(result.goals.map((g) => g.key)).toEqual([
      'sleep',
      'school',
      'extraClass',
      'selfStudy',
      'meals',
      'entertainment',
    ]);
  });

  it('notes a target goal as "N% of target"', () => {
    const activities = WEEKDAYS.flatMap((date) => [
      activity({ categoryId: 'self-study', date, startMinutes: 0, endMinutes: 90 }), // 90/180 = 50%
    ]);
    const week = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
    const selfStudy = getWeekEfficiency(week).goals.find((g) => g.key === 'selfStudy');
    expect(selfStudy).toMatchObject({ percent: 50, note: '50% of target' });
  });

  it('notes entertainment as "Within cap" when every tracked day stayed under it', () => {
    const activities = WEEKDAYS.flatMap((date) => [
      activity({ categoryId: 'entertainment', date, startMinutes: 0, endMinutes: 60 }),
    ]);
    const week = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
    const entertainment = getWeekEfficiency(week).goals.find((g) => g.key === 'entertainment');
    expect(entertainment).toMatchObject({ percent: 100, note: 'Within cap' });
  });

  it('notes entertainment as over cap on N of M days when it went over', () => {
    const minutesByDay = [60, 120, 150, 60, 60]; // over on 2 of 5 days
    const activities = WEEKDAYS.flatMap((date, i) => [
      activity({ categoryId: 'entertainment', date, startMinutes: 0, endMinutes: minutesByDay[i] }),
    ]);
    const week = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
    const entertainment = getWeekEfficiency(week).goals.find((g) => g.key === 'entertainment');
    expect(entertainment?.note).toBe('Over cap on 2 of 5 days');
  });

  it('reports a goal with no applicable/tracked data as null with a neutral note', () => {
    const week = evaluateWeek([], GOALS, WEEK_START, AFTER_WEEK);
    const selfStudy = getWeekEfficiency(week).goals.find((g) => g.key === 'selfStudy');
    expect(selfStudy).toMatchObject({ percent: null, note: 'Not tracked yet' });
  });
});
