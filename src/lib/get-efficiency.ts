import { type DayEvaluation, GOAL_META, type GoalFinding, type GoalKey } from './evaluate-day';
import { GOAL_ORDER, type WeekEvaluation } from './evaluate-week';
import type { IsoDate } from './types';

/**
 * ADR-009 §2.2 D6 ("% hiệu quả" formula) + D7 (untracked days excluded).
 * Reuses slice 4's `evaluateDay`/`evaluateWeek` — this module only turns
 * their per-goal actual/target findings into 0-1 scores and averages them.
 * Pure, no clock reads: callers pass in a `DayEvaluation`/`WeekEvaluation`
 * already built with `now`.
 *
 * Per-goal score (D6):
 * - Target goals (sleep, school, extraClass, selfStudy, meals):
 *   `min(actual / target, 1)`. A `target` of exactly 0 (the student set "no
 *   goal needed") trivially scores 1 rather than dividing by zero.
 * - Entertainment (a cap, not a target): `1` at or under the cap, else
 *   `max(0, 1 - (actual - cap) / cap)`.
 * - A goal with no target to score against — entertainment with "no limit"
 *   (`maxMinutesPerDay: null`) — scores `null` and is excluded from the
 *   day/week average, same as a goal that doesn't apply that day (school on a
 *   non-school day never appears in `findings` at all).
 *
 * Shape matches slice 8's `DaySummary.goals` (`{ actual, target, score }` per
 * goal) so `buildDaySummary` can store this module's output directly.
 */

export interface GoalEfficiency {
  key: GoalKey;
  label: string;
  icon: string;
  isCap: boolean;
  actualMinutes: number;
  /** `null` when the goal has nothing to score against (entertainment with no cap). */
  targetMinutes: number | null;
  /** 0-1, capped; `null` when this goal is excluded from the day's average. */
  score: number | null;
}

export interface DayEfficiency {
  date: IsoDate;
  /** 0-100, rounded; `null` when the day is untracked (D7 — nothing logged at all). */
  percent: number | null;
  goals: GoalEfficiency[];
}

export interface WeekEfficiencyDay {
  date: IsoDate;
  /** `null` = untracked or not yet ended (shown as "–" — D7). */
  percent: number | null;
}

export interface WeekGoalEfficiency {
  key: GoalKey;
  label: string;
  icon: string;
  isCap: boolean;
  /** Mean score (0-100, rounded) over this week's tracked days this goal applied to and had
   * a target; `null` when it never did. */
  percent: number | null;
  /** Short label for the bar, e.g. "62% of target", "Within cap", "Over cap on 2 of 5 days". */
  note: string;
}

export interface WeekEfficiency {
  weekStart: IsoDate;
  /** Mean of the week's tracked days' `percent` (D6); `null` with no tracked days. */
  average: number | null;
  days: WeekEfficiencyDay[];
  goals: WeekGoalEfficiency[];
}

function scoreForGoal(finding: GoalFinding): number | null {
  if (finding.targetMinutes === null) return null;
  if (finding.isCap) {
    const cap = finding.targetMinutes;
    if (finding.actualMinutes <= cap) return 1;
    return Math.max(0, 1 - (finding.actualMinutes - cap) / cap);
  }
  if (finding.targetMinutes === 0) return 1; // nothing required -> trivially met
  return Math.min(finding.actualMinutes / finding.targetMinutes, 1);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100);
}

/**
 * One day's % hiệu quả (ADR-009 welcome-back dialog ④, D6/D7) — per-goal
 * scores for every goal that applied that day, and the day's overall percent
 * (mean over the goals with a non-null score), or `null` when nothing at all
 * was logged that day.
 */
export function getDayEfficiency(evaluation: DayEvaluation): DayEfficiency {
  const goals: GoalEfficiency[] = evaluation.findings.map((finding) => ({
    key: finding.key,
    label: finding.label,
    icon: finding.icon,
    isCap: finding.isCap,
    actualMinutes: finding.actualMinutes,
    targetMinutes: finding.targetMinutes,
    score: scoreForGoal(finding),
  }));

  const scored = goals.map((g) => g.score).filter((score): score is number => score !== null);

  const percent = evaluation.totalTrackedMinutes > 0 ? average(scored) : null;

  return { date: evaluation.date, percent, goals };
}

function noteFor(
  key: GoalKey,
  isCap: boolean,
  percent: number | null,
  relevant: GoalEfficiency[]
): string {
  if (percent === null) return isCap ? 'No cap set' : 'Not tracked yet';
  if (isCap) {
    const overDays = relevant.filter((g) => g.score !== null && g.score < 1).length;
    return overDays > 0 ? `Over cap on ${overDays} of ${relevant.length} days` : 'Within cap';
  }
  return `${percent}% of target`;
}

/**
 * A week's % hiệu quả (ADR-009 Insights ⑤) — one entry per day (Mon-Sun,
 * `null`/"–" for days that are untracked or haven't ended yet, D7), the
 * week's average over tracked days only (D6), and the six per-goal bars with
 * a short note each.
 */
export function getWeekEfficiency(week: WeekEvaluation): WeekEfficiency {
  const perDay = week.days.map((day) => ({
    day,
    tracked: day.dayEnded && day.totalTrackedMinutes > 0,
    efficiency: getDayEfficiency(day),
  }));

  const days: WeekEfficiencyDay[] = perDay.map(({ day, tracked, efficiency }) => ({
    date: day.date,
    percent: tracked ? efficiency.percent : null,
  }));

  const trackedPercents = days.map((d) => d.percent).filter((p): p is number => p !== null);
  const weekAverage =
    trackedPercents.length > 0
      ? Math.round(trackedPercents.reduce((a, b) => a + b, 0) / trackedPercents.length)
      : null;

  const goals: WeekGoalEfficiency[] = GOAL_ORDER.map((key) => {
    const meta = GOAL_META[key];
    const isCap = key === 'entertainment';
    const relevant = perDay
      .filter((d) => d.tracked)
      .map((d) => d.efficiency.goals.find((g) => g.key === key))
      .filter((g): g is GoalEfficiency => g !== undefined && g.score !== null);

    const percent =
      relevant.length > 0
        ? Math.round((relevant.reduce((sum, g) => sum + (g.score ?? 0), 0) / relevant.length) * 100)
        : null;

    return {
      key,
      label: meta.label,
      icon: meta.icon,
      isCap,
      percent,
      note: noteFor(key, isCap, percent, relevant),
    };
  });

  return { weekStart: week.weekStart, average: weekAverage, days, goals };
}
