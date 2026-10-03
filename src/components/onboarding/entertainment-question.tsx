'use client';

import { CategoryMapSelect } from '@/components/category-map-select';
import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category, HabitGoals } from '@/lib/types';
import { useId } from 'react';

const MIN = 0;
const MAX = 720;
const STEP = 15;
const DEFAULT_WHEN_LEAVING_NO_LIMIT = 90;

const CHIPS = [
  { label: '1h', minutes: 60 },
  { label: '1h 30m', minutes: 90 },
  { label: '2h', minutes: 120 },
] as const;

interface EntertainmentQuestionProps {
  value: HabitGoals['entertainment'];
  onChange: (value: HabitGoals['entertainment']) => void;
  categories: Category[];
  /** Habits & goals ⑨: hide the wizard's heading/description/footer note. */
  compact?: boolean;
}

/**
 * ⑥ Q5 Entertainment (ADR-008 §1.2): a cap ("at most"), not a target —
 * "No limit" is a valid answer (D6).
 */
export function EntertainmentQuestion({
  value,
  onChange,
  categories,
  compact,
}: EntertainmentQuestionProps) {
  const headingId = useId();
  const unlimited = value.maxMinutesPerDay === null;
  const minutes = value.maxMinutesPerDay ?? DEFAULT_WHEN_LEAVING_NO_LIMIT;

  function setMinutes(next: number) {
    onChange({ ...value, maxMinutesPerDay: Math.min(MAX, Math.max(MIN, next)) });
  }

  return (
    <div className="flex flex-col gap-5">
      {!compact && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            How much free time is OK for you?
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Games, videos, social media. We&apos;ll only nudge you if you go over.
          </p>
        </div>
      )}

      <div>
        <p id={headingId} className="mb-2 text-sm font-medium">
          At most per day
        </p>
        <fieldset className="m-0 flex items-center gap-4 border-0 p-0" aria-labelledby={headingId}>
          <button
            type="button"
            aria-label="Decrease entertainment cap"
            onClick={() => setMinutes(minutes - STEP)}
            disabled={unlimited || minutes <= MIN}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 text-lg font-medium transition-colors hover:bg-surface-muted disabled:opacity-40 dark:border-zinc-700"
          >
            −
          </button>
          <div className="min-w-28 text-center">
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {unlimited ? 'No limit' : formatMinutes(minutes)}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">entertainment</p>
          </div>
          <button
            type="button"
            aria-label="Increase entertainment cap"
            onClick={() => setMinutes(minutes + STEP)}
            disabled={unlimited || minutes >= MAX}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 text-lg font-medium transition-colors hover:bg-surface-muted disabled:opacity-40 dark:border-zinc-700"
          >
            +
          </button>
        </fieldset>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onChange({ ...value, maxMinutesPerDay: chip.minutes })}
              aria-pressed={!unlimited && value.maxMinutesPerDay === chip.minutes}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
                !unlimited && value.maxMinutesPerDay === chip.minutes
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-zinc-300 text-zinc-700 hover:bg-surface-muted dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...value, maxMinutesPerDay: null })}
            aria-pressed={unlimited}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
              unlimited
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                : 'border-zinc-300 text-zinc-700 hover:bg-surface-muted dark:border-zinc-700 dark:text-zinc-300'
            }`}
          >
            No limit
          </button>
        </div>
      </div>

      <CategoryMapSelect
        categories={categories}
        value={value.categoryId}
        onChange={(categoryId) => onChange({ ...value, categoryId })}
      />

      {!compact && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Other things (exercise, chores…) fit into the time that is left — you&apos;ll see it on
          the next screen.
        </p>
      )}
    </div>
  );
}
