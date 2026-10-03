import { describe, expect, it } from 'vitest';
import { buildDaySummary } from './build-day-summary';
import { evaluateDay } from './evaluate-day';
import { GOAL_ORDER } from './evaluate-week';
import { getDayEfficiency } from './get-efficiency';
import { suggestedHabitGoals } from './suggested-habit-goals';
import type { Activity, HabitGoals } from './types';

/**
 * ADR-009 §2.1/§2.5 slice 8a — `buildDaySummary` turns slice 4/5's
 * `evaluateDay`/`getDayEfficiency` output plus the day's rating score into
 * the parent-visible `DaySummary` (D14: numbers only). Same marker-string
 * technique as `build-ai-prompt.test.ts`.
 */

const GOALS: HabitGoals = {
  version: 1,
  status: 'completed',
  lastStep: 5,
  ...suggestedHabitGoals(),
  createdAt: 1,
  updatedAt: 1,
};
// Sleep target 450m/bedtime 23:00; school Mon-Sat 07:00-11:30+13:30-16:30;
// extraClass 120m; selfStudy 180m; meals 90m; entertainment cap 90m.

const SATURDAY = '2026-10-03'; // a school day (days: 1..6)
const SUNDAY = '2026-10-04'; // not a school day
const MONDAY = '2026-10-05';
const NOW_ON_SATURDAY = new Date('2026-10-03T12:00:00');
const NOW_ON_MONDAY = new Date('2026-10-05T09:00:00'); // so SUNDAY has fully ended

const SECRET_ACTIVITY_NAME = 'Minh Anh tutoring session with Mrs. Lan';
const SECRET_CATEGORY_ID = "Minh Anh's Custom Hobby Time";
const SECRET_NOTE = 'Had a huge fight with my parents tonight.';
const SECRET_EMAIL = 'minh.anh.secret@example.com';
const SECRET_DISPLAY_NAME = 'Minh Anh';

let nextId = 0;
function activity(
  partial: Partial<Activity> & Pick<Activity, 'categoryId' | 'date' | 'startMinutes' | 'endMinutes'>
): Activity {
  nextId++;
  return { id: `a${nextId}`, name: SECRET_ACTIVITY_NAME, createdAt: nextId, ...partial };
}

function trackedSaturdayActivities(): Activity[] {
  return [
    activity({ categoryId: 'sleep', date: SATURDAY, startMinutes: 60, endMinutes: 430 }), // 6h10m
    activity({ categoryId: 'school', date: SATURDAY, startMinutes: 420, endMinutes: 690 }),
    activity({ categoryId: 'school', date: SATURDAY, startMinutes: 810, endMinutes: 990 }),
    activity({ categoryId: 'self-study', date: SATURDAY, startMinutes: 1000, endMinutes: 1112 }),
    activity({
      categoryId: SECRET_CATEGORY_ID,
      date: SATURDAY,
      startMinutes: 1120,
      endMinutes: 1220,
    }),
    activity({ categoryId: 'entertainment', date: SATURDAY, startMinutes: 1225, endMinutes: 1300 }),
  ];
}

describe('buildDaySummary — D14 "numbers only"', () => {
  it('never contains an activity name, category name, note, email or display name', () => {
    const activities = trackedSaturdayActivities();
    const evaluation = evaluateDay(activities, GOALS, SATURDAY, NOW_ON_SATURDAY);
    const efficiency = getDayEfficiency(evaluation);
    const summary = buildDaySummary(evaluation, efficiency, 4, 1_700_000_000_000);
    const json = JSON.stringify(summary);

    expect(json).not.toContain(SECRET_ACTIVITY_NAME);
    expect(json).not.toContain(SECRET_CATEGORY_ID);
    expect(json).not.toContain(SECRET_NOTE);
    expect(json).not.toContain(SECRET_EMAIL);
    expect(json).not.toContain(SECRET_DISPLAY_NAME);
  });

  it('only ever has the keys actual/target/score per goal, and the five top-level fields', () => {
    const activities = trackedSaturdayActivities();
    const evaluation = evaluateDay(activities, GOALS, SATURDAY, NOW_ON_SATURDAY);
    const efficiency = getDayEfficiency(evaluation);
    const summary = buildDaySummary(evaluation, efficiency, 4, 1);

    expect(Object.keys(summary).sort()).toEqual(
      ['efficiency', 'goals', 'ratingScore', 'updatedAt', 'warnings'].sort()
    );
    expect(Object.keys(summary.goals).sort()).toEqual([...GOAL_ORDER].sort());
    for (const key of GOAL_ORDER) {
      expect(Object.keys(summary.goals[key]).sort()).toEqual(['actual', 'score', 'target'].sort());
    }
  });

  it('passes through efficiency, per-goal actual/target/score and warnings on a tracked day', () => {
    const activities = trackedSaturdayActivities();
    const evaluation = evaluateDay(activities, GOALS, SATURDAY, NOW_ON_SATURDAY);
    const efficiency = getDayEfficiency(evaluation);
    const summary = buildDaySummary(evaluation, efficiency, 4, 1);

    expect(summary.efficiency).toBe(efficiency.percent);
    expect(summary.warnings).toEqual(evaluation.warnings);
    expect(summary.warnings).toContain('sleep-short'); // 6h10m < 7h30m target

    const sleepFinding = evaluation.findings.find((f) => f.key === 'sleep');
    const sleepEfficiency = efficiency.goals.find((g) => g.key === 'sleep');
    expect(summary.goals.sleep).toEqual({
      actual: sleepFinding?.actualMinutes,
      target: sleepFinding?.targetMinutes,
      score: sleepEfficiency?.score,
    });
  });

  it('reports a goal that does not apply that day (school on a non-school day) as actual 0 / target null / score null', () => {
    const activities = [
      activity({ categoryId: 'self-study', date: SUNDAY, startMinutes: 600, endMinutes: 700 }),
    ];
    const evaluation = evaluateDay(activities, GOALS, SUNDAY, NOW_ON_MONDAY);
    const efficiency = getDayEfficiency(evaluation);
    const summary = buildDaySummary(evaluation, efficiency, null, 1);

    expect(summary.goals.school).toEqual({ actual: 0, target: null, score: null });
  });

  it('is null/empty on an untracked day (D7) — efficiency null, every goal score null, no warnings', () => {
    const evaluation = evaluateDay([], GOALS, SUNDAY, NOW_ON_MONDAY);
    const efficiency = getDayEfficiency(evaluation);
    expect(efficiency.percent).toBeNull(); // sanity: this day really is untracked

    // evaluateDay on its own would still warn "target-missed" for extraClass/
    // selfStudy/meals since the (ended) day never met them — but an untracked
    // day shouldn't accuse the student of anything (D7 "don't punish not
    // logging"), so the stored summary suppresses warnings/scores entirely.
    expect(evaluation.warnings.length).toBeGreaterThan(0);

    const summary = buildDaySummary(evaluation, efficiency, null, 1);

    expect(summary.efficiency).toBeNull();
    expect(summary.warnings).toEqual([]);
    expect(summary.ratingScore).toBeNull();
    for (const key of GOAL_ORDER) {
      expect(summary.goals[key].score).toBeNull();
    }
  });

  it('still carries a rating-only day’s score even though nothing was tracked', () => {
    const evaluation = evaluateDay([], GOALS, SUNDAY, NOW_ON_MONDAY);
    const efficiency = getDayEfficiency(evaluation);
    const summary = buildDaySummary(evaluation, efficiency, 5, 2);

    expect(summary.efficiency).toBeNull();
    expect(summary.ratingScore).toBe(5);
    expect(summary.updatedAt).toBe(2);
  });

  it('is null when the day was not rated', () => {
    const evaluation = evaluateDay(trackedSaturdayActivities(), GOALS, SATURDAY, NOW_ON_SATURDAY);
    const efficiency = getDayEfficiency(evaluation);
    const summary = buildDaySummary(evaluation, efficiency, null, 1);

    expect(summary.ratingScore).toBeNull();
  });
});
