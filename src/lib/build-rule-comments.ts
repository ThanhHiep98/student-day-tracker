import type { GoalKey } from './evaluate-day';
import type { WeekEvaluation, WeekGoalSummary } from './evaluate-week';
import { formatMinutes } from './get-daily-summary';

/**
 * ADR-009 §1.2 ⑥ "Comments on your week" — up to three neutral, specific
 * sentences built from `evaluateWeek`'s rollup (D5: specific numbers, no
 * good/bad framing, at most one suggestion overall). Always available,
 * offline too — this is the rule-based fallback F3's AI comment sits on top
 * of. Returns `[]` when the week has no tracked days at all.
 */
export function buildRuleComments(week: WeekEvaluation): string[] {
  return [sleepComment(week), entertainmentComment(week), targetsComment(week)].filter(
    (comment): comment is string => comment !== null
  );
}

function sleepComment(week: WeekEvaluation): string | null {
  const sleep = week.goals.find((g) => g.key === 'sleep');
  if (
    !sleep ||
    sleep.trackedDays === 0 ||
    sleep.averageActualMinutes === null ||
    sleep.targetMinutes === null
  ) {
    return null;
  }
  const avg = formatMinutes(sleep.averageActualMinutes);
  const target = formatMinutes(sleep.targetMinutes);
  const diff = sleep.targetMinutes - sleep.averageActualMinutes;
  if (diff > 0)
    return `You slept ${avg} on average — ${formatMinutes(diff)} less than your ${target} goal.`;
  if (diff < 0)
    return `You slept ${avg} on average — ${formatMinutes(-diff)} more than your ${target} goal.`;
  return `You slept ${avg} on average, matching your ${target} goal.`;
}

function entertainmentComment(week: WeekEvaluation): string | null {
  const entertainment = week.goals.find((g) => g.key === 'entertainment');
  if (!entertainment || entertainment.trackedDays === 0 || entertainment.targetMinutes === null) {
    return null;
  }
  const cap = formatMinutes(entertainment.targetMinutes);
  if (entertainment.overCount > 0) {
    return `Entertainment went over your ${cap} cap on ${entertainment.overCount} of ${entertainment.trackedDays} days.`;
  }
  return `Entertainment stayed within your ${cap} cap this week.`;
}

const TARGET_GOAL_KEYS: GoalKey[] = ['school', 'extraClass', 'selfStudy', 'meals'];

/** "and"/", and" join, matching ordinary prose (D5 neutral wording). */
function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function targetsComment(week: WeekEvaluation): string | null {
  const tracked = TARGET_GOAL_KEYS.map((key) => week.goals.find((g) => g.key === key)).filter(
    (g): g is WeekGoalSummary => g !== undefined && g.trackedDays > 0
  );
  if (tracked.length === 0) return null;

  const below = tracked.filter((g) => !g.onPlan && g.percentOfTarget !== null);
  const onPlan = tracked.filter((g) => g.onPlan);

  const clauses = below.map(
    (g) =>
      `${g.label} reached ${g.percentOfTarget}% of your ${formatMinutes(g.targetMinutes ?? 0)} goal`
  );
  if (onPlan.length > 0) {
    const verb = onPlan.length === 1 ? 'was' : 'were';
    clauses.push(`${joinAnd(onPlan.map((g) => g.label))} ${verb} on plan`);
  }
  if (clauses.length === 0) return null;
  return `${clauses.join('; ')}.`;
}
