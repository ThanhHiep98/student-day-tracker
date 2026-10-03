import { MINUTES_PER_DAY } from './activity-span';
import { minutesToClock } from './clock-time';
import { formatMinutes } from './get-daily-summary';
import { fromIsoDate, toIsoDate } from './iso-date';
import type { Activity, HabitGoals, IsoDate } from './types';

/**
 * ADR-009 §2.1/§2.5 "One pure evaluation core" — `evaluateDay` turns one
 * day's activities + the student's goals (ADR-008) into per-goal actual vs.
 * target findings, a bedtime nudge and warning codes. Pure — `now` is passed
 * in, never read from the clock. Reused by slice 5 (`getEfficiency`) and
 * slice 8 (`buildDaySummary`), which is why findings keep both the raw
 * numbers (`actualMinutes`/`targetMinutes`) and the display text.
 *
 * `activities` must include `date` **and the day before it** — a sleep
 * session that crosses midnight into `date` is stored as two rows (slice 1),
 * and the earlier row (the actual bedtime) lives on the previous day.
 * Everything else only looks at rows whose `date` is exactly `date`.
 */

export type GoalKey = 'sleep' | 'school' | 'extraClass' | 'selfStudy' | 'meals' | 'entertainment';

/** `ok` = on plan / done; `warn` = a cap exceeded or a target missed after the day ended (D3);
 * `pending` = a target still in progress, shown as "to go" (D3). */
export type GoalStatus = 'ok' | 'warn' | 'pending';

/** Mirrors `DaySummary.warnings` (ADR-009 §2.3), reused by slice 8's `buildDaySummary`. */
export type WarningCode = 'sleep-short' | 'bedtime-late' | 'entertainment-over' | 'target-missed';

export interface GoalFinding {
  key: GoalKey;
  /** Noun label for comments/summaries, e.g. "Self-study". */
  label: string;
  icon: string;
  /** The row's left-hand text, e.g. "Slept 6h 10m" or "Entertainment 1h 10m". */
  actualText: string;
  /** Entertainment is a cap ("at most"), not a minimum target. */
  isCap: boolean;
  status: GoalStatus;
  actualMinutes: number;
  /** `null` only for entertainment when the student set "no limit" (D6). */
  targetMinutes: number | null;
  /** The row's right-hand text, e.g. "1h 20m under 7h 30m", "1h 30m to go", "done". */
  message: string;
}

export interface BedtimeFinding {
  actualMinutes: number;
  goalMinutes: number;
  /** Minutes after the goal bedtime (can be negative = earlier); D4 warns past +30. */
  lateMinutes: number;
  status: 'ok' | 'warn';
  /** Only set when `status === 'warn'` (the amber nudge line); `''` otherwise. */
  message: string;
}

export interface DayEvaluation {
  date: IsoDate;
  /** `date` is before today (ADR-009 §2.2 D3's "after the day ends"). */
  dayEnded: boolean;
  /** Sum of every logged activity's minutes on `date`, regardless of goal mapping — 0 means
   * "untracked" (D7), excluding the day from `evaluateWeek`'s averages. */
  totalTrackedMinutes: number;
  /** Canonical order: sleep, school (school days only), extraClass, selfStudy, meals, entertainment. */
  findings: GoalFinding[];
  /** `null` when no sleep session ends on `date` yet (nothing logged). */
  bedtime: BedtimeFinding | null;
  warnings: WarningCode[];
}

/** D4: warn once bedtime is more than this many minutes after the goal. */
export const BEDTIME_WARN_MINUTES = 30;

export const GOAL_META: Record<GoalKey, { label: string; icon: string; rowPrefix: string }> = {
  sleep: { label: 'Sleep', icon: '😴', rowPrefix: 'Slept' },
  school: { label: 'School', icon: '🏫', rowPrefix: 'School' },
  extraClass: { label: 'Extra class', icon: '📝', rowPrefix: 'Extra class' },
  selfStudy: { label: 'Self-study', icon: '📖', rowPrefix: 'Self-study' },
  meals: { label: 'Meals', icon: '🍚', rowPrefix: 'Meals' },
  entertainment: { label: 'Entertainment', icon: '🎮', rowPrefix: 'Entertainment' },
};

/**
 * The category id backing `key` under the current goal→category mapping
 * (ADR-008 D-B iii, editable on `/goals`). `evaluateDay` itself only needs
 * this internally (`minutesFor`, `schoolMinutesLogged`); it's exported for
 * callers outside the findings that still need a goal's category — e.g.
 * slice 5's efficiency bars, which color each goal by its own category
 * (CLAUDE.md: no new hardcoded colors outside a category's own `color`).
 */
export function goalCategoryId(goals: HabitGoals, key: GoalKey): string {
  switch (key) {
    case 'sleep':
      return goals.sleep.categoryId;
    case 'school':
      return goals.school.categoryId;
    case 'extraClass':
      return goals.extraClass.categoryId;
    case 'selfStudy':
      return goals.selfStudy.categoryId;
    case 'meals':
      return goals.meals.categoryId;
    case 'entertainment':
      return goals.entertainment.categoryId;
  }
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Signed minutes from `goalMinutes` to `actualMinutes`, taking the shortest
 * way around the clock (±12h) — a bedtime just after midnight reads as a few
 * minutes "late" against an evening goal, not almost a full day late.
 */
export function bedtimeOffsetMinutes(actualMinutes: number, goalMinutes: number): number {
  const half = MINUTES_PER_DAY / 2;
  return mod(actualMinutes - goalMinutes + half, MINUTES_PER_DAY) - half;
}

function isSpanHead(a: Pick<Activity, 'id' | 'spanId'>): boolean {
  return a.spanId !== undefined && a.spanId === a.id;
}

function minutesFor(dayActivities: Activity[], categoryId: string): number {
  return dayActivities
    .filter((a) => a.categoryId === categoryId)
    .reduce((sum, a) => sum + Math.max(0, a.endMinutes - a.startMinutes), 0);
}

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function schoolBlockMinutes(school: HabitGoals['school']): number {
  return school.blocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);
}

/** Only the time inside the school's own blocks counts (D3 "within its blocks"). */
function schoolMinutesLogged(dayActivities: Activity[], school: HabitGoals['school']): number {
  const schoolActivities = dayActivities.filter((a) => a.categoryId === school.categoryId);
  let total = 0;
  for (const activity of schoolActivities) {
    for (const block of school.blocks) {
      total += overlapMinutes(
        activity.startMinutes,
        activity.endMinutes,
        block.startMinutes,
        block.endMinutes
      );
    }
  }
  return total;
}

/** 1 = Monday … 7 = Sunday, matching `HabitGoals.school.days`. */
function isoWeekday(date: IsoDate): number {
  const day = fromIsoDate(date).getDay(); // 0 = Sunday
  return day === 0 ? 7 : day;
}

interface SleepSession {
  actualMinutes: number;
  bedtimeMinutes: number;
}

/**
 * D3: sleep is judged on "the sleep span that ends today" — the session
 * whose last row's `date` is `date` (a same-day row, or the tail of a span
 * that started the day before). A span head on `date` that continues into
 * tomorrow (`spanId === id`, `endMinutes === 1440`) is excluded: it ends
 * tomorrow, not today. When more than one session ends on `date` (e.g. a nap
 * plus the night's sleep), the longer one is treated as "the" sleep span.
 */
function findSleepSessionEndingOn(
  activities: Activity[],
  categoryId: string,
  date: IsoDate
): SleepSession | null {
  const byId = new Map(activities.map((a) => [a.id, a] as const));
  const enders = activities.filter(
    (a) => a.categoryId === categoryId && a.date === date && !isSpanHead(a)
  );
  if (enders.length === 0) return null;

  const sessions = enders.map((row): SleepSession => {
    const isTail = row.spanId !== undefined && row.spanId !== row.id;
    if (!isTail) {
      return { actualMinutes: row.endMinutes - row.startMinutes, bedtimeMinutes: row.startMinutes };
    }
    const head = row.spanId !== undefined ? byId.get(row.spanId) : undefined;
    const headMinutes = head ? head.endMinutes - head.startMinutes : 0;
    const bedtimeMinutes = head ? head.startMinutes : row.startMinutes;
    return { actualMinutes: headMinutes + (row.endMinutes - row.startMinutes), bedtimeMinutes };
  });

  return sessions.reduce((best, s) => (s.actualMinutes > best.actualMinutes ? s : best));
}

function evaluateSleepGoal(session: SleepSession | null, targetMinutes: number): GoalFinding {
  const meta = GOAL_META.sleep;
  const actualMinutes = session?.actualMinutes ?? 0;
  const actualText = `${meta.rowPrefix} ${formatMinutes(actualMinutes)}`;
  if (!session) {
    return {
      key: 'sleep',
      label: meta.label,
      icon: meta.icon,
      actualText,
      isCap: false,
      status: 'pending',
      actualMinutes,
      targetMinutes,
      message: 'not logged yet',
    };
  }
  if (session.actualMinutes >= targetMinutes) {
    return {
      key: 'sleep',
      label: meta.label,
      icon: meta.icon,
      actualText,
      isCap: false,
      status: 'ok',
      actualMinutes,
      targetMinutes,
      message: `met your ${formatMinutes(targetMinutes)} goal`,
    };
  }
  return {
    key: 'sleep',
    label: meta.label,
    icon: meta.icon,
    actualText,
    isCap: false,
    status: 'warn',
    actualMinutes,
    targetMinutes,
    message: `${formatMinutes(targetMinutes - actualMinutes)} under ${formatMinutes(targetMinutes)}`,
  };
}

/** Targets (school/extraClass/selfStudy/meals): "to go" mid-day, a warning only after the
 * day ends (D3). Meals keeps a softer "so far" instead of a countdown number. */
function evaluateTargetGoal(
  key: Exclude<GoalKey, 'sleep' | 'entertainment'>,
  actualMinutes: number,
  targetMinutes: number,
  dayEnded: boolean
): GoalFinding {
  const meta = GOAL_META[key];
  const actualText = `${meta.rowPrefix} ${formatMinutes(actualMinutes)}`;
  const base = {
    key,
    label: meta.label,
    icon: meta.icon,
    actualText,
    isCap: false,
    actualMinutes,
    targetMinutes,
  };
  if (actualMinutes >= targetMinutes) {
    return { ...base, status: 'ok', message: 'done' };
  }
  if (!dayEnded) {
    const message =
      key === 'meals' ? 'so far' : `${formatMinutes(targetMinutes - actualMinutes)} to go`;
    return { ...base, status: 'pending', message };
  }
  return {
    ...base,
    status: 'warn',
    message: `${formatMinutes(targetMinutes - actualMinutes)} under ${formatMinutes(targetMinutes)}`,
  };
}

/** Entertainment is a cap, warned live (D3) rather than waiting for the day to end. */
function evaluateCapGoal(actualMinutes: number, capMinutes: number | null): GoalFinding {
  const meta = GOAL_META.entertainment;
  const actualText = `${meta.rowPrefix} ${formatMinutes(actualMinutes)}`;
  const base = {
    key: 'entertainment' as const,
    label: meta.label,
    icon: meta.icon,
    actualText,
    isCap: true,
    actualMinutes,
    targetMinutes: capMinutes,
  };
  if (capMinutes === null) {
    return { ...base, status: 'ok', message: `${formatMinutes(actualMinutes)} logged` };
  }
  if (actualMinutes <= capMinutes) {
    return { ...base, status: 'ok', message: `within ${formatMinutes(capMinutes)}` };
  }
  return {
    ...base,
    status: 'warn',
    message: `${formatMinutes(actualMinutes - capMinutes)} over the ${formatMinutes(capMinutes)} cap`,
  };
}

function buildBedtimeFinding(
  actualBedtimeMinutes: number,
  goalBedtimeMinutes: number
): BedtimeFinding {
  const lateMinutes = bedtimeOffsetMinutes(actualBedtimeMinutes, goalBedtimeMinutes);
  if (lateMinutes <= BEDTIME_WARN_MINUTES) {
    return {
      actualMinutes: actualBedtimeMinutes,
      goalMinutes: goalBedtimeMinutes,
      lateMinutes,
      status: 'ok',
      message: '',
    };
  }
  return {
    actualMinutes: actualBedtimeMinutes,
    goalMinutes: goalBedtimeMinutes,
    lateMinutes,
    status: 'warn',
    message: `You went to bed at ${minutesToClock(actualBedtimeMinutes)} — ${formatMinutes(lateMinutes)} later than your ${minutesToClock(goalBedtimeMinutes)} plan. An earlier night today would get you back on track.`,
  };
}

export function evaluateDay(
  activities: Activity[],
  goals: HabitGoals,
  date: IsoDate,
  now: Date
): DayEvaluation {
  const dayEnded = date < toIsoDate(now);
  const dayActivities = activities.filter((a) => a.date === date);

  const findings: GoalFinding[] = [];

  const sleepSession = findSleepSessionEndingOn(activities, goals.sleep.categoryId, date);
  findings.push(evaluateSleepGoal(sleepSession, goals.sleep.targetMinutes));

  if (goals.school.days.includes(isoWeekday(date))) {
    findings.push(
      evaluateTargetGoal(
        'school',
        schoolMinutesLogged(dayActivities, goals.school),
        schoolBlockMinutes(goals.school),
        dayEnded
      )
    );
  }

  findings.push(
    evaluateTargetGoal(
      'extraClass',
      minutesFor(dayActivities, goals.extraClass.categoryId),
      goals.extraClass.targetMinutesPerDay,
      dayEnded
    )
  );
  findings.push(
    evaluateTargetGoal(
      'selfStudy',
      minutesFor(dayActivities, goals.selfStudy.categoryId),
      goals.selfStudy.targetMinutesPerDay,
      dayEnded
    )
  );
  findings.push(
    evaluateTargetGoal(
      'meals',
      minutesFor(dayActivities, goals.meals.categoryId),
      goals.meals.targetMinutesPerDay,
      dayEnded
    )
  );
  findings.push(
    evaluateCapGoal(
      minutesFor(dayActivities, goals.entertainment.categoryId),
      goals.entertainment.maxMinutesPerDay
    )
  );

  const bedtime = sleepSession
    ? buildBedtimeFinding(sleepSession.bedtimeMinutes, goals.sleep.bedtimeMinutes)
    : null;

  const warnings: WarningCode[] = [];
  for (const finding of findings) {
    if (finding.status !== 'warn') continue;
    if (finding.key === 'sleep') warnings.push('sleep-short');
    else if (finding.key === 'entertainment') warnings.push('entertainment-over');
    else warnings.push('target-missed');
  }
  if (bedtime?.status === 'warn') warnings.push('bedtime-late');

  const totalTrackedMinutes = dayActivities.reduce(
    (sum, a) => sum + Math.max(0, a.endMinutes - a.startMinutes),
    0
  );

  return { date, dayEnded, totalTrackedMinutes, findings, bedtime, warnings };
}
