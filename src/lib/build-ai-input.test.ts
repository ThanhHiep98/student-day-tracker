import { describe, expect, it } from 'vitest';
import { buildAiInput, hashAiInput } from './build-ai-input';
import { evaluateWeek } from './evaluate-week';
import { getWeekEfficiency } from './get-efficiency';
import { suggestedHabitGoals } from './suggested-habit-goals';
import type { Activity, HabitGoals } from './types';

const WEEK_START = '2026-09-28';
const AFTER_WEEK = new Date('2026-10-05T09:00:00');
const WEEKDAYS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];

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
  return { id: `a${nextId}`, name: 'ZZZ-MARKER-ACTIVITY-ZZZ', createdAt: nextId, ...partial };
}

function weekdayActivities(date: string): Activity[] {
  return [
    activity({ categoryId: 'sleep', date, startMinutes: 60, endMinutes: 438 }), // bedtime 01:00, 378m
    activity({ categoryId: 'school', date, startMinutes: 420, endMinutes: 690 }),
    activity({ categoryId: 'school', date, startMinutes: 810, endMinutes: 990 }),
    activity({ categoryId: 'self-study', date, startMinutes: 1000, endMinutes: 1112 }),
    activity({ categoryId: 'entertainment', date, startMinutes: 1120, endMinutes: 1220 }), // over 90m cap
  ];
}

function buildWeekFixture() {
  const activities = WEEKDAYS.flatMap(weekdayActivities);
  const week = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
  const efficiency = getWeekEfficiency(week);
  return { week, efficiency };
}

describe('buildAiInput', () => {
  it('carries the week average, per-day percents and per-goal aggregates', () => {
    const { week, efficiency } = buildWeekFixture();
    const input = buildAiInput(week, efficiency, []);

    expect(input.weekStart).toBe(WEEK_START);
    expect(input.weekAveragePercent).toBe(efficiency.average);
    expect(input.dayPercents).toEqual(efficiency.days);
    expect(input.goals.map((g) => g.key)).toEqual(week.goals.map((g) => g.key));
    const sleep = input.goals.find((g) => g.key === 'sleep');
    expect(sleep).toMatchObject({ trackedDays: 5, averageActualMinutes: 378, targetMinutes: 450 });
  });

  it('averages the given ratings (ignoring whatever note they carry) and null with none', () => {
    const { week, efficiency } = buildWeekFixture();
    expect(buildAiInput(week, efficiency, []).averageRating).toBeNull();
    const withRatings = buildAiInput(week, efficiency, [
      { date: '2026-09-28', score: 4 },
      { date: '2026-09-29', score: 5 },
    ]);
    expect(withRatings.averageRating).toBe(4.5);
  });

  it('collects bedtime offsets only for tracked, ended days with a sleep session', () => {
    const { week, efficiency } = buildWeekFixture();
    const input = buildAiInput(week, efficiency, []);
    expect(input.bedtimeOffsetMinutes).toHaveLength(5);
    expect(input.bedtimeOffsetMinutes.every((m) => m === 120)).toBe(true); // 01:00 vs. 23:00 goal bedtime
  });

  it('never contains a string from an activity name (numbers + fixed labels only)', () => {
    const { week, efficiency } = buildWeekFixture();
    const input = buildAiInput(week, efficiency, []);
    expect(JSON.stringify(input)).not.toContain('ZZZ-MARKER-ACTIVITY-ZZZ');
  });

  it('is empty-week safe: all null/0, no crash', () => {
    const week = evaluateWeek([], GOALS, WEEK_START, AFTER_WEEK);
    const efficiency = getWeekEfficiency(week);
    const input = buildAiInput(week, efficiency, []);
    expect(input.weekAveragePercent).toBeNull();
    expect(input.bedtimeOffsetMinutes).toEqual([]);
    expect(input.averageRating).toBeNull();
  });
});

describe('hashAiInput', () => {
  it('is deterministic for the same input', () => {
    const { week, efficiency } = buildWeekFixture();
    const input = buildAiInput(week, efficiency, []);
    expect(hashAiInput(input)).toBe(hashAiInput(input));
    expect(hashAiInput(input)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('changes when the input changes', () => {
    const { week, efficiency } = buildWeekFixture();
    const a = buildAiInput(week, efficiency, []);
    const b = buildAiInput(week, efficiency, [{ date: '2026-09-28', score: 3 }]);
    expect(hashAiInput(a)).not.toBe(hashAiInput(b));
  });
});
