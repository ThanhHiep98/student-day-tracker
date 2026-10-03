'use client';

import type { HabitGoalsFields } from '@/lib/build-habit-goals';
import { minutesToClock } from '@/lib/clock-time';
import { formatMinutes } from '@/lib/get-daily-summary';
import { type DayBudgetSegment, getDayBudget } from '@/lib/get-day-budget';
import { getWakeTime } from '@/lib/get-wake-time';
import type { Category } from '@/lib/types';

interface ReviewStepProps {
  fields: HabitGoalsFields;
  categories: Category[];
  /** Jump back to the step that owns a segment (1 = sleep … 5 = entertainment). */
  onEdit: (step: number) => void;
}

const STEP_BY_KEY: Record<DayBudgetSegment['key'], number> = {
  sleep: 1,
  school: 2,
  extraClass: 3,
  selfStudy: 3,
  meals: 4,
  entertainment: 5,
};

function categoryOf(categories: Category[], id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

/** ⑦ Review (ADR-008 §1.2): the 24h stacked bar the student's days are compared against. */
export function ReviewStep({ fields, categories, onEdit }: ReviewStepProps) {
  const budget = getDayBudget(fields);
  const wake = getWakeTime(fields.sleep.bedtimeMinutes, fields.sleep.targetMinutes);
  // Scale so the bar still reads as "24h" even when the plan runs over.
  const scale = budget.totalMinutes > 1440 ? 1440 / budget.totalMinutes : 1;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Your ideal school day</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          This is the plan we&apos;ll compare your days against.
        </p>
      </div>

      <div>
        <div
          role="img"
          aria-label={`${formatMinutes(budget.totalMinutes)} planned of 24 hours: ${budget.segments
            .map((s) => `${s.label} ${formatMinutes(s.minutes)}`)
            .join(', ')}`}
          className="flex h-3 w-full overflow-hidden rounded-full bg-surface-muted"
        >
          {budget.segments
            .filter((s) => s.minutes > 0)
            .map((s) => (
              <span
                key={s.key}
                style={{
                  width: `${(s.minutes * scale * 100) / 1440}%`,
                  backgroundColor: categoryOf(categories, s.categoryId)?.color ?? '#a1a1aa',
                }}
              />
            ))}
          {budget.freeMinutes > 0 && (
            <span
              style={{ width: `${(budget.freeMinutes * scale * 100) / 1440}%` }}
              className="bg-zinc-200 dark:bg-zinc-700"
            />
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <span>24h</span>
          {budget.freeMinutes >= 0 ? (
            <span>
              <strong className="font-semibold text-foreground">
                {formatMinutes(budget.freeMinutes)}
              </strong>{' '}
              left for exercise, travel, chores…
            </span>
          ) : (
            <span className="font-medium text-rose-600 dark:text-rose-400">
              {formatMinutes(-budget.freeMinutes)} over 24 hours
            </span>
          )}
        </div>
      </div>

      <ul className="divide-y divide-border">
        {budget.segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex items-center gap-2">
              <span aria-hidden>{categoryOf(categories, segment.categoryId)?.icon}</span>
              <span className="font-medium">
                {segment.label}
                {segment.key === 'sleep' && (
                  <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                    · {minutesToClock(fields.sleep.bedtimeMinutes)} → {minutesToClock(wake)}
                  </span>
                )}
                {segment.isCap && (
                  <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                    · at most
                  </span>
                )}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-semibold tabular-nums">
                {segment.key === 'entertainment' && fields.entertainment.maxMinutesPerDay === null
                  ? 'No limit'
                  : formatMinutes(segment.minutes)}
              </span>
              <button
                type="button"
                onClick={() => onEdit(STEP_BY_KEY[segment.key])}
                className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
              >
                Edit
              </button>
            </span>
          </li>
        ))}
      </ul>

      {budget.tight && !budget.overBudget && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <span aria-hidden>⚠️</span>
          <span>
            <strong className="font-semibold">Tight day:</strong> only{' '}
            {formatMinutes(Math.max(budget.freeMinutes, 0))} left for travel, exercise and rest. You
            can still save — or lower a target.
          </span>
        </p>
      )}

      {budget.overBudget && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          Your plan adds up to more than 24 hours. Lower a target before saving.
        </p>
      )}
    </div>
  );
}
