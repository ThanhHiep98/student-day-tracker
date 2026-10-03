import { describe, expect, it } from 'vitest';
import {
  BEDTIME_WARN_MINUTES,
  bedtimeOffsetMinutes,
  evaluateDay,
  goalCategoryId,
} from './evaluate-day';
import { suggestedHabitGoals } from './suggested-habit-goals';
import type { Activity, HabitGoals } from './types';

const TODAY = '2026-10-03'; // Saturday
const YESTERDAY = '2026-10-02'; // Friday
const NOW_MIDDAY = new Date('2026-10-03T12:00:00');

const GOALS: HabitGoals = {
  version: 1,
  status: 'completed',
  lastStep: 5,
  ...suggestedHabitGoals(),
  createdAt: 1,
  updatedAt: 1,
};
// Sleep target 7h30m (450m), bedtime goal 23:00 (1380m); school Mon-Sat
// 07:00-11:30 + 13:30-16:30; extraClass 2h; selfStudy 3h; meals 90m;
// entertainment cap 90m (suggestedHabitGoals, lớp 12 defaults).

let nextId = 0;
function activity(
  partial: Partial<Activity> & Pick<Activity, 'categoryId' | 'date' | 'startMinutes' | 'endMinutes'>
): Activity {
  nextId++;
  return {
    id: `a${nextId}`,
    name: 'Activity',
    createdAt: nextId,
    ...partial,
  };
}

describe('bedtimeOffsetMinutes (circular diff)', () => {
  it('reads a bedtime after midnight as a few minutes late against an evening goal', () => {
    // Goal 23:00 (1380), actual 00:40 (40) -> 1h40m late.
    expect(bedtimeOffsetMinutes(40, 1380)).toBe(100);
  });

  it('reads an earlier evening bedtime as negative (early)', () => {
    // Goal 23:00 (1380), actual 22:00 (1320) -> 1h early.
    expect(bedtimeOffsetMinutes(1320, 1380)).toBe(-60);
  });

  it('returns 0 for an exact match', () => {
    expect(bedtimeOffsetMinutes(1380, 1380)).toBe(0);
  });

  it('is exactly at the D4 boundary at +30 and +31', () => {
    expect(bedtimeOffsetMinutes(1410, 1380)).toBe(BEDTIME_WARN_MINUTES);
    expect(bedtimeOffsetMinutes(1411, 1380)).toBe(BEDTIME_WARN_MINUTES + 1);
  });
});

describe('evaluateDay — sleep (D3: judged on the span that ends today)', () => {
  it('is pending with no data when nothing ends on the date yet', () => {
    const result = evaluateDay([], GOALS, TODAY, NOW_MIDDAY);
    const sleep = result.findings.find((f) => f.key === 'sleep');
    expect(sleep).toMatchObject({ status: 'pending', actualMinutes: 0, message: 'not logged yet' });
    expect(result.bedtime).toBeNull();
  });

  it('warns immediately mid-day once the span ends short, even though the day has not ended', () => {
    // 00:40-06:50 same-day entry entirely on TODAY, 6h10m < 7h30m target.
    const activities = [
      activity({ categoryId: 'sleep', date: TODAY, startMinutes: 40, endMinutes: 410 }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    expect(result.dayEnded).toBe(false);
    const sleep = result.findings.find((f) => f.key === 'sleep');
    expect(sleep).toMatchObject({
      status: 'warn',
      actualMinutes: 370,
      actualText: 'Slept 6h 10m',
      message: '1h 20m under 7h 30m',
    });
    expect(result.warnings).toContain('sleep-short');
  });

  it('is ok once the target is met, even mid-day', () => {
    const activities = [
      activity({ categoryId: 'sleep', date: TODAY, startMinutes: 0, endMinutes: 450 }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    const sleep = result.findings.find((f) => f.key === 'sleep');
    expect(sleep?.status).toBe('ok');
    expect(result.warnings).not.toContain('sleep-short');
  });

  it('sums a cross-midnight span (head + tail) and uses the head start as bedtime', () => {
    const headId = 'sleep-span';
    const activities = [
      activity({
        id: headId,
        spanId: headId,
        categoryId: 'sleep',
        date: YESTERDAY,
        startMinutes: 1380, // 23:00
        endMinutes: 1440,
      }),
      activity({
        id: `${headId}-next`,
        spanId: headId,
        categoryId: 'sleep',
        date: TODAY,
        startMinutes: 0,
        endMinutes: 390, // 06:30
      }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    const sleep = result.findings.find((f) => f.key === 'sleep');
    expect(sleep?.actualMinutes).toBe(450); // 60 + 390
    expect(sleep?.status).toBe('ok');
    expect(result.bedtime).toMatchObject({ actualMinutes: 1380, status: 'ok' });
  });

  it('excludes a span head on `date` that continues into tomorrow (ends tomorrow, not today)', () => {
    const headId = 'open-span';
    const activities = [
      activity({
        id: headId,
        spanId: headId,
        categoryId: 'sleep',
        date: TODAY,
        startMinutes: 1380,
        endMinutes: 1440,
      }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    const sleep = result.findings.find((f) => f.key === 'sleep');
    expect(sleep).toMatchObject({ status: 'pending', actualMinutes: 0 });
  });

  it('picks the longer of two sessions ending the same day (e.g. a nap plus the night sleep)', () => {
    const activities = [
      activity({ categoryId: 'sleep', date: TODAY, startMinutes: 0, endMinutes: 420 }), // 7h night sleep
      activity({ categoryId: 'sleep', date: TODAY, startMinutes: 780, endMinutes: 810 }), // 30m nap
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    const sleep = result.findings.find((f) => f.key === 'sleep');
    expect(sleep?.actualMinutes).toBe(420);
  });
});

describe('evaluateDay — bedtime nudge (D4: warn past +30 minutes)', () => {
  function withBedtime(actualBedtimeMinutes: number) {
    return evaluateDay(
      [
        activity({
          categoryId: 'sleep',
          date: TODAY,
          startMinutes: actualBedtimeMinutes,
          endMinutes: 1430,
        }),
      ],
      GOALS,
      TODAY,
      NOW_MIDDAY
    );
  }

  it('is ok at exactly +30 minutes', () => {
    expect(withBedtime(1410).bedtime).toMatchObject({ status: 'ok', lateMinutes: 30, message: '' });
  });

  it('warns with the exact nudge wording at +31 minutes', () => {
    const result = withBedtime(1411);
    expect(result.bedtime).toMatchObject({ status: 'warn', lateMinutes: 31 });
    expect(result.bedtime?.message).toBe(
      'You went to bed at 23:31 — 31m later than your 23:00 plan. An earlier night today would get you back on track.'
    );
    expect(result.warnings).toContain('bedtime-late');
  });

  it('does not warn for an earlier-than-goal bedtime', () => {
    const result = withBedtime(1320); // 22:00
    expect(result.bedtime?.status).toBe('ok');
  });
});

describe('evaluateDay — school (D3: school days only, within its blocks)', () => {
  it('has no school finding on a non-school day', () => {
    const sunday = '2026-10-04';
    const result = evaluateDay([], GOALS, sunday, new Date('2026-10-04T12:00:00'));
    expect(result.findings.find((f) => f.key === 'school')).toBeUndefined();
  });

  it('only counts time inside the school blocks, not time logged outside them', () => {
    const activities = [
      // 06:00-07:30 overlaps the 07:00-11:30 block by 30m; 11:30-12:30 is outside any block.
      activity({ categoryId: 'school', date: TODAY, startMinutes: 360, endMinutes: 450 }),
      activity({ categoryId: 'school', date: TODAY, startMinutes: 690, endMinutes: 750 }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    const school = result.findings.find((f) => f.key === 'school');
    expect(school?.actualMinutes).toBe(30);
  });

  it('is "done" once the full planned block time is logged', () => {
    const activities = [
      activity({ categoryId: 'school', date: TODAY, startMinutes: 420, endMinutes: 690 }),
      activity({ categoryId: 'school', date: TODAY, startMinutes: 810, endMinutes: 990 }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    expect(result.findings.find((f) => f.key === 'school')).toMatchObject({
      status: 'ok',
      message: 'done',
    });
  });
});

describe.each([
  ['extraClass', 'extra-class', 120] as const,
  ['selfStudy', 'self-study', 180] as const,
  ['meals', 'meals', 90] as const,
])(
  'evaluateDay — %s target (D3: "to go" mid-day, a warning only after the day ends)',
  (key, categoryId, target) => {
    it('shows "to go" (or "so far" for meals) mid-day when under target', () => {
      const activities = [
        activity({ categoryId, date: TODAY, startMinutes: 0, endMinutes: target - 30 }),
      ];
      const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
      const finding = result.findings.find((f) => f.key === key);
      expect(finding?.status).toBe('pending');
      expect(finding?.message).toBe(key === 'meals' ? 'so far' : '30m to go');
    });

    it('is "done" once the target is met, even mid-day', () => {
      const activities = [
        activity({ categoryId, date: TODAY, startMinutes: 0, endMinutes: target }),
      ];
      const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
      expect(result.findings.find((f) => f.key === key)).toMatchObject({
        status: 'ok',
        message: 'done',
      });
    });

    it('only warns once the day has ended and the target was missed', () => {
      const past = '2026-10-01';
      const activities = [
        activity({ categoryId, date: past, startMinutes: 0, endMinutes: target - 30 }),
      ];
      const result = evaluateDay(activities, GOALS, past, NOW_MIDDAY);
      expect(result.dayEnded).toBe(true);
      expect(result.findings.find((f) => f.key === key)).toMatchObject({ status: 'warn' });
      expect(result.warnings).toContain('target-missed');
    });
  }
);

describe('evaluateDay — entertainment (D3: a cap warns live, not just after the day ends)', () => {
  it('is ok within the cap', () => {
    const activities = [
      activity({ categoryId: 'entertainment', date: TODAY, startMinutes: 0, endMinutes: 70 }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    expect(result.findings.find((f) => f.key === 'entertainment')).toMatchObject({
      status: 'ok',
      message: 'within 1h 30m',
    });
  });

  it('warns immediately once over the cap, even though the day has not ended', () => {
    const activities = [
      activity({ categoryId: 'entertainment', date: TODAY, startMinutes: 0, endMinutes: 130 }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    expect(result.dayEnded).toBe(false);
    expect(result.findings.find((f) => f.key === 'entertainment')).toMatchObject({
      status: 'warn',
      message: '40m over the 1h 30m cap',
    });
    expect(result.warnings).toContain('entertainment-over');
  });

  it('is always ok with "no limit" (null cap)', () => {
    const goals = { ...GOALS, entertainment: { ...GOALS.entertainment, maxMinutesPerDay: null } };
    const activities = [
      activity({ categoryId: 'entertainment', date: TODAY, startMinutes: 0, endMinutes: 500 }),
    ];
    const result = evaluateDay(activities, goals, TODAY, NOW_MIDDAY);
    expect(result.findings.find((f) => f.key === 'entertainment')).toMatchObject({
      status: 'ok',
      targetMinutes: null,
      message: '8h 20m logged',
    });
  });
});

describe('evaluateDay — totalTrackedMinutes / dayEnded (D7 untracked days)', () => {
  it('is 0 on an untracked day', () => {
    const result = evaluateDay([], GOALS, TODAY, NOW_MIDDAY);
    expect(result.totalTrackedMinutes).toBe(0);
  });

  it('sums every logged activity regardless of its goal mapping', () => {
    const activities = [
      activity({ categoryId: 'work', date: TODAY, startMinutes: 0, endMinutes: 60 }),
      activity({ categoryId: 'meals', date: TODAY, startMinutes: 60, endMinutes: 90 }),
    ];
    const result = evaluateDay(activities, GOALS, TODAY, NOW_MIDDAY);
    expect(result.totalTrackedMinutes).toBe(90);
  });

  it('dayEnded is false for today and true for a date before today', () => {
    expect(evaluateDay([], GOALS, TODAY, NOW_MIDDAY).dayEnded).toBe(false);
    expect(evaluateDay([], GOALS, YESTERDAY, NOW_MIDDAY).dayEnded).toBe(true);
  });
});

describe('goalCategoryId (ADR-008 D-B iii mapping, used by slice 5 for per-goal bar colors)', () => {
  it('returns each goal area’s current category id', () => {
    expect(goalCategoryId(GOALS, 'sleep')).toBe('sleep');
    expect(goalCategoryId(GOALS, 'school')).toBe('school');
    expect(goalCategoryId(GOALS, 'extraClass')).toBe('extra-class');
    expect(goalCategoryId(GOALS, 'selfStudy')).toBe('self-study');
    expect(goalCategoryId(GOALS, 'meals')).toBe('meals');
    expect(goalCategoryId(GOALS, 'entertainment')).toBe('entertainment');
  });

  it('follows a remapped goal (D-B: goals can point at a different/custom category)', () => {
    const remapped: HabitGoals = {
      ...GOALS,
      sleep: { ...GOALS.sleep, categoryId: 'custom-rest' },
    };
    expect(goalCategoryId(remapped, 'sleep')).toBe('custom-rest');
  });
});
