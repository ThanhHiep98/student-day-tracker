import { describe, expect, it } from 'vitest';
import { buildRuleComments } from './build-rule-comments';
import { GOAL_META, type GoalKey } from './evaluate-day';
import { evaluateWeek } from './evaluate-week';
import type { WeekEvaluation, WeekGoalSummary } from './evaluate-week';
import { suggestedHabitGoals } from './suggested-habit-goals';
import type { Activity, HabitGoals } from './types';

const EMPTY_GOAL = (key: GoalKey, isCap = false): WeekGoalSummary => ({
  key,
  label: GOAL_META[key].label,
  icon: GOAL_META[key].icon,
  isCap,
  targetMinutes: null,
  trackedDays: 0,
  averageActualMinutes: null,
  percentOfTarget: null,
  overCount: 0,
  onPlan: true,
});

function week(overrides: Partial<Record<GoalKey, Partial<WeekGoalSummary>>>): WeekEvaluation {
  const keys: GoalKey[] = ['sleep', 'school', 'extraClass', 'selfStudy', 'meals', 'entertainment'];
  return {
    weekStart: '2026-09-28',
    days: [],
    bedtimeLateDays: 0,
    bedtimeTrackedDays: 0,
    goals: keys.map((key) => ({ ...EMPTY_GOAL(key, key === 'entertainment'), ...overrides[key] })),
  };
}

describe('buildRuleComments — sleep', () => {
  it('reports sleeping less than the goal on average', () => {
    const comments = buildRuleComments(
      week({ sleep: { trackedDays: 5, averageActualMinutes: 378, targetMinutes: 450 } })
    );
    expect(comments[0]).toBe('You slept 6h 18m on average — 1h 12m less than your 7h 30m goal.');
  });

  it('reports sleeping more than the goal on average', () => {
    const comments = buildRuleComments(
      week({ sleep: { trackedDays: 5, averageActualMinutes: 480, targetMinutes: 450 } })
    );
    expect(comments[0]).toBe('You slept 8h on average — 30m more than your 7h 30m goal.');
  });

  it('reports an exact match without "more"/"less"', () => {
    const comments = buildRuleComments(
      week({ sleep: { trackedDays: 5, averageActualMinutes: 450, targetMinutes: 450 } })
    );
    expect(comments[0]).toBe('You slept 7h 30m on average, matching your 7h 30m goal.');
  });

  it('omits the sleep comment with no tracked days', () => {
    const comments = buildRuleComments(week({}));
    expect(comments.some((c) => c.startsWith('You slept'))).toBe(false);
  });
});

describe('buildRuleComments — entertainment cap', () => {
  it('reports the days over cap', () => {
    const comments = buildRuleComments(
      week({ entertainment: { trackedDays: 5, targetMinutes: 90, overCount: 3 } })
    );
    expect(comments).toContain('Entertainment went over your 1h 30m cap on 3 of 5 days.');
  });

  it('reports staying within the cap when never exceeded', () => {
    const comments = buildRuleComments(
      week({ entertainment: { trackedDays: 5, targetMinutes: 90, overCount: 0 } })
    );
    expect(comments).toContain('Entertainment stayed within your 1h 30m cap this week.');
  });

  it('omits the entertainment comment when there is no cap set', () => {
    const comments = buildRuleComments(
      week({ entertainment: { trackedDays: 5, targetMinutes: null, overCount: 0 } })
    );
    expect(comments.some((c) => c.includes('Entertainment'))).toBe(false);
  });

  it('omits the entertainment comment with no tracked days', () => {
    const comments = buildRuleComments(week({}));
    expect(comments.some((c) => c.includes('Entertainment'))).toBe(false);
  });
});

describe('buildRuleComments — the other targets (school, extraClass, selfStudy, meals)', () => {
  it('combines one below-target goal with the rest "on plan" (ADR-009 §1.2 ⑥)', () => {
    const comments = buildRuleComments(
      week({
        school: { trackedDays: 5, targetMinutes: 450, onPlan: true },
        extraClass: { trackedDays: 5, targetMinutes: 120, onPlan: true },
        selfStudy: { trackedDays: 5, targetMinutes: 180, percentOfTarget: 62, onPlan: false },
      })
    );
    expect(comments).toContain(
      'Self-study reached 62% of your 3h goal; School and Extra class were on plan.'
    );
  });

  it('uses singular "was" for a single on-plan goal', () => {
    const comments = buildRuleComments(
      week({
        school: { trackedDays: 5, targetMinutes: 450, onPlan: true },
        selfStudy: { trackedDays: 5, targetMinutes: 180, percentOfTarget: 62, onPlan: false },
      })
    );
    expect(comments).toContain('Self-study reached 62% of your 3h goal; School was on plan.');
  });

  it('joins three or more on-plan goals with a serial comma', () => {
    const comments = buildRuleComments(
      week({
        school: { trackedDays: 5, targetMinutes: 450, onPlan: true },
        extraClass: { trackedDays: 5, targetMinutes: 120, onPlan: true },
        meals: { trackedDays: 5, targetMinutes: 90, onPlan: true },
        selfStudy: { trackedDays: 5, targetMinutes: 180, percentOfTarget: 62, onPlan: false },
      })
    );
    expect(comments).toContain(
      'Self-study reached 62% of your 3h goal; School, Extra class, and Meals were on plan.'
    );
  });

  it('reports every goal on plan with no below-target clause', () => {
    const comments = buildRuleComments(
      week({
        school: { trackedDays: 5, targetMinutes: 450, onPlan: true },
        extraClass: { trackedDays: 5, targetMinutes: 120, onPlan: true },
      })
    );
    expect(comments).toContain('School and Extra class were on plan.');
  });

  it('reports multiple below-target goals, each with its own percentage', () => {
    const comments = buildRuleComments(
      week({
        selfStudy: { trackedDays: 5, targetMinutes: 180, percentOfTarget: 62, onPlan: false },
        meals: { trackedDays: 5, targetMinutes: 90, percentOfTarget: 80, onPlan: false },
      })
    );
    expect(comments).toContain(
      'Self-study reached 62% of your 3h goal; Meals reached 80% of your 1h 30m goal.'
    );
  });

  it('omits the comment entirely when none of the four targets have tracked days', () => {
    const comments = buildRuleComments(week({}));
    expect(comments.some((c) => c.includes('on plan') || c.includes('reached'))).toBe(false);
  });
});

describe('buildRuleComments — overall', () => {
  it('returns [] for a week with no tracked days at all', () => {
    expect(buildRuleComments(week({}))).toEqual([]);
  });

  it('reproduces the ADR-009 §1.2 ⑥ example end to end via evaluateWeek', () => {
    const goals: HabitGoals = {
      version: 1,
      status: 'completed',
      lastStep: 5,
      ...suggestedHabitGoals(),
      createdAt: 1,
      updatedAt: 1,
    };
    const weekdays = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
    const entertainmentMinutes = [100, 50, 120, 80, 95]; // over the 90m cap on 3 of 5 days
    let id = 0;
    const row = (
      p: Partial<Activity> & Pick<Activity, 'categoryId' | 'date' | 'startMinutes' | 'endMinutes'>
    ): Activity => {
      id++;
      return { id: `r${id}`, name: 'Activity', createdAt: id, ...p };
    };
    const activities = weekdays.flatMap((date, i) => [
      row({ categoryId: 'sleep', date, startMinutes: 0, endMinutes: 378 }),
      row({ categoryId: 'school', date, startMinutes: 420, endMinutes: 690 }),
      row({ categoryId: 'school', date, startMinutes: 810, endMinutes: 990 }),
      row({ categoryId: 'extra-class', date, startMinutes: 1000, endMinutes: 1120 }),
      row({ categoryId: 'self-study', date, startMinutes: 1120, endMinutes: 1232 }),
      row({ categoryId: 'meals', date, startMinutes: 1232, endMinutes: 1322 }),
      row({
        categoryId: 'entertainment',
        date,
        startMinutes: 1322,
        endMinutes: 1322 + entertainmentMinutes[i],
      }),
    ]);

    const result = evaluateWeek(activities, goals, '2026-09-28', new Date('2026-10-05T09:00:00'));
    const comments = buildRuleComments(result);

    expect(comments).toEqual([
      'You slept 6h 18m on average — 1h 12m less than your 7h 30m goal.',
      'Entertainment went over your 1h 30m cap on 3 of 5 days.',
      'Self-study reached 62% of your 3h goal; School, Extra class, and Meals were on plan.',
    ]);
  });
});

describe('buildRuleComments — D5 neutral wording (no good/bad framing)', () => {
  const BANNED = [/\bgood\b/i, /\bbad\b/i, /bad day/i, /\bfailed\b/i];
  const PERCENTS = [0, 1, 20, 50, 62, 80, 99, 100, 110];
  const COUNTS = [0, 1, 3, 5, 7];

  it('never uses "good"/"bad"/"bad day"/"failed" across a wide combination of weeks', () => {
    const seen: string[] = [];
    for (const avg of [300, 378, 450, 500]) {
      for (const overCount of COUNTS) {
        for (const pct of PERCENTS) {
          const w = week({
            sleep: { trackedDays: 5, averageActualMinutes: avg, targetMinutes: 450 },
            entertainment: { trackedDays: 5, targetMinutes: 90, overCount },
            selfStudy: {
              trackedDays: 5,
              targetMinutes: 180,
              percentOfTarget: pct,
              onPlan: pct >= 100,
            },
            school: { trackedDays: 5, targetMinutes: 450, onPlan: true },
            meals: { trackedDays: 5, targetMinutes: 90, onPlan: true },
          });
          seen.push(...buildRuleComments(w));
        }
      }
    }
    expect(seen.length).toBeGreaterThan(0);
    for (const comment of seen) {
      for (const pattern of BANNED) {
        expect(comment).not.toMatch(pattern);
      }
    }
  });
});
