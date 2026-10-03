import type { DayEvaluation } from './evaluate-day';
import { GOAL_ORDER } from './evaluate-week';
import type { DayEfficiency } from './get-efficiency';
import type { DaySummary } from './types';

/**
 * ADR-009 §2.1/§2.5 slice 8a — the only place that turns a day's full
 * evaluation (`evaluateDay`, slice 4) and efficiency (`getDayEfficiency`,
 * slice 5) into the parent-visible `DaySummary` (§2.3, D14). Pure: no clock
 * reads, no Firestore. By construction it can only ever read numeric fields
 * off `evaluation`/`efficiency` (`actualMinutes`/`targetMinutes`/`score`/
 * `warnings`) plus the caller-supplied `ratingScore` number — never a
 * finding's `label`/`icon`/`actualText`/`message` (those are display text for
 * the student's own UI) and never a `DayRating`'s `note`. Unit-tested with
 * marker strings the same way as `build-ai-prompt.test.ts`.
 *
 * D7 ("don't punish not logging"): on a day with nothing tracked at all
 * (`efficiency.percent === null`), every per-goal `score` is forced to
 * `null` and `warnings` is forced to `[]` — `evaluateDay` itself still
 * produces `target-missed` warnings for an ended, untracked day (useful for
 * the student's own "today vs your plan" card), but a parent-visible summary
 * of a day the student simply didn't open the app should not report it as a
 * missed goal. `actual`/`target` are kept even on an untracked day (they
 * describe the student's plan, not anything they did), `goals.actual`
 * defaulting to 0 and `target` to `null` for a goal that didn't even apply
 * that day (e.g. school on a non-school day).
 */
export function buildDaySummary(
  evaluation: DayEvaluation,
  efficiency: DayEfficiency,
  ratingScore: number | null,
  updatedAt: number
): DaySummary {
  const tracked = efficiency.percent !== null;

  const goals = {} as DaySummary['goals'];
  for (const key of GOAL_ORDER) {
    const finding = evaluation.findings.find((f) => f.key === key);
    const goalEfficiency = efficiency.goals.find((g) => g.key === key);
    goals[key] = {
      actual: finding?.actualMinutes ?? 0,
      target: finding?.targetMinutes ?? null,
      score: tracked ? (goalEfficiency?.score ?? null) : null,
    };
  }

  return {
    efficiency: efficiency.percent,
    goals,
    warnings: tracked ? evaluation.warnings : [],
    ratingScore,
    updatedAt,
  };
}
