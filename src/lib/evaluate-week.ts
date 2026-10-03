import {
  type DayEvaluation,
  GOAL_META,
  type GoalFinding,
  type GoalKey,
  evaluateDay,
} from './evaluate-day';
import { addDays } from './iso-date';
import type { Activity, HabitGoals, IsoDate } from './types';

/** Canonical goal order, matching `HabitGoals` and `evaluateDay`'s findings. */
const GOAL_ORDER: GoalKey[] = [
  'sleep',
  'school',
  'extraClass',
  'selfStudy',
  'meals',
  'entertainment',
];

export interface WeekGoalSummary {
  key: GoalKey;
  label: string;
  icon: string;
  isCap: boolean;
  /** The goal's target/cap, or `null` if it never applied this week (school) or has no cap set. */
  targetMinutes: number | null;
  /** Days this week this goal applied to, had already ended, and weren't untracked (D7). */
  trackedDays: number;
  averageActualMinutes: number | null;
  /** `actual / target * 100`, rounded; `null` for caps or when `trackedDays === 0`. */
  percentOfTarget: number | null;
  /** Caps: days the actual went over the cap. Targets: days that ended below target. */
  overCount: number;
  /** No violation this week (or no data to judge one). */
  onPlan: boolean;
}

export interface WeekEvaluation {
  weekStart: IsoDate;
  days: DayEvaluation[];
  /** One entry per `GOAL_ORDER` key, always present even with no data (`trackedDays: 0`). */
  goals: WeekGoalSummary[];
  bedtimeLateDays: number;
  bedtimeTrackedDays: number;
}

/**
 * ADR-009 §2.1 "One pure evaluation core" — the weekly rollup `buildRuleComments`
 * (and later slice 5's `getEfficiency`) read. Pure — `now` is passed to each
 * day's `evaluateDay`, never read from the clock.
 *
 * `activities` must cover `[weekStart - 1 day, weekStart + 6 days]` — the day
 * before the week too, for the Monday's sleep span (see `evaluate-day.ts`).
 * Today and any day with nothing logged at all are excluded from the
 * per-goal averages (D3's "after the day ends", D7's "untracked days don't
 * count").
 */
export function evaluateWeek(
  activities: Activity[],
  goals: HabitGoals,
  weekStart: IsoDate,
  now: Date
): WeekEvaluation {
  const days = Array.from({ length: 7 }, (_, i) =>
    evaluateDay(activities, goals, addDays(weekStart, i), now)
  );
  const countedDays = days.filter((d) => d.dayEnded && d.totalTrackedMinutes > 0);

  const goalSummaries: WeekGoalSummary[] = GOAL_ORDER.map((key) => {
    const meta = GOAL_META[key];
    const isCap = key === 'entertainment';
    const relevant = countedDays
      .map((d) => d.findings.find((f) => f.key === key))
      .filter((f): f is GoalFinding => f !== undefined);

    if (relevant.length === 0) {
      return {
        key,
        label: meta.label,
        icon: meta.icon,
        isCap,
        targetMinutes: null,
        trackedDays: 0,
        averageActualMinutes: null,
        percentOfTarget: null,
        overCount: 0,
        onPlan: true,
      };
    }

    const targetMinutes = relevant[0].targetMinutes;
    const averageActualMinutes = Math.round(
      relevant.reduce((sum, f) => sum + f.actualMinutes, 0) / relevant.length
    );
    const overCount = relevant.filter((f) => f.status === 'warn').length;
    const percentOfTarget =
      !isCap && targetMinutes ? Math.round((averageActualMinutes / targetMinutes) * 100) : null;

    return {
      key,
      label: meta.label,
      icon: meta.icon,
      isCap,
      targetMinutes,
      trackedDays: relevant.length,
      averageActualMinutes,
      percentOfTarget,
      overCount,
      onPlan: overCount === 0,
    };
  });

  const bedtimeDays = countedDays.filter((d) => d.bedtime !== null);
  const bedtimeLateDays = bedtimeDays.filter((d) => d.bedtime?.status === 'warn').length;

  return {
    weekStart,
    days,
    goals: goalSummaries,
    bedtimeLateDays,
    bedtimeTrackedDays: bedtimeDays.length,
  };
}
