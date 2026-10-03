import type { GoalKey } from './evaluate-day';
import type { WeekEvaluation } from './evaluate-week';
import type { WeekEfficiency } from './get-efficiency';
import type { IsoDate } from './types';

/**
 * ADR-009 §2.1/§2.5 F3 "AI input" (D10) — turns the already-aggregated
 * `evaluateWeek`/`getWeekEfficiency` output + this week's ratings into the
 * *only* thing ever sent to Gemini. By construction it can hold nothing but
 * numbers, fixed goal labels (`GOAL_META`, not user-editable category names)
 * and dates: never a name, email, activity name, category name typed by the
 * user, or a rating's note. `buildAiPrompt` (build-ai-prompt.ts) turns this
 * into the literal prompt text; `hashAiInput` fingerprints it for the cached
 * `aiComments/{date}` doc's `inputHash` (CLAUDE.md "AI input is built by a
 * pure build*Prompt helper from aggregated numbers only").
 */

export interface AiInputGoal {
  key: GoalKey;
  label: string;
  isCap: boolean;
  /** The goal's target/cap this week, or `null` when it never applied (school) or has no cap. */
  targetMinutes: number | null;
  trackedDays: number;
  averageActualMinutes: number | null;
  percentOfTarget: number | null;
  overCount: number;
}

export interface AiInput {
  weekStart: IsoDate;
  /** `null` with no tracked days this week. */
  weekAveragePercent: number | null;
  dayPercents: { date: IsoDate; percent: number | null }[];
  goals: AiInputGoal[];
  /** Mean of this week's day ratings (1-5, one decimal), `null` with none. */
  averageRating: number | null;
  /** Minutes past the bedtime goal (negative = earlier) for every tracked,
   * ended day with a sleep session — numbers only, no dates attached. */
  bedtimeOffsetMinutes: number[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Pure — takes already-computed aggregates, never reads the clock or raw
 * activities/notes. `ratings` should already be scoped to the same week as
 * `week`/`weekEfficiency` (e.g. `useDayRatingsRange(weekStart, weekEnd)`,
 * dropping each entry's `note`).
 */
export function buildAiInput(
  week: WeekEvaluation,
  weekEfficiency: WeekEfficiency,
  ratings: { date: IsoDate; score: number }[]
): AiInput {
  const goals: AiInputGoal[] = week.goals.map((g) => ({
    key: g.key,
    label: g.label,
    isCap: g.isCap,
    targetMinutes: g.targetMinutes,
    trackedDays: g.trackedDays,
    averageActualMinutes: g.averageActualMinutes,
    percentOfTarget: g.percentOfTarget,
    overCount: g.overCount,
  }));

  const averageRating =
    ratings.length > 0
      ? round1(ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length)
      : null;

  const bedtimeOffsetMinutes = week.days
    .filter((d) => d.dayEnded && d.bedtime !== null)
    .map((d) => d.bedtime?.lateMinutes ?? 0);

  return {
    weekStart: week.weekStart,
    weekAveragePercent: weekEfficiency.average,
    dayPercents: weekEfficiency.days.map((d) => ({ date: d.date, percent: d.percent })),
    goals,
    averageRating,
    bedtimeOffsetMinutes,
  };
}

/**
 * Deterministic, non-cryptographic fingerprint of an `AiInput` (FNV-1a,
 * 32-bit) — just needs to change whenever the input would, for the cached
 * `aiComments/{date}.inputHash` field; not a security boundary.
 */
export function hashAiInput(input: AiInput): string {
  const json = JSON.stringify(input);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
