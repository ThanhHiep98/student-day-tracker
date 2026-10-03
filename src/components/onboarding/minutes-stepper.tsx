'use client';

import { formatMinutes } from '@/lib/get-daily-summary';
import { useId } from 'react';

export interface MinutesStepperChip {
  label: string;
  minutes: number;
}

interface MinutesStepperProps {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
  sublabel: string;
  min: number;
  max: number;
  step?: number;
  chips?: MinutesStepperChip[];
  /** Rendered after the chip row, e.g. a "No limit" toggle (entertainment). */
  extraChip?: { label: string; selected: boolean; onSelect: () => void };
}

/**
 * The −/value/+ stepper with suggestion chips used by every duration question
 * (ADR-008 §1.2 ②④⑤⑥): 15-minute steps, clamped to the D6 range so the UI
 * can never produce a value `buildHabitGoals` would reject.
 */
export function MinutesStepper({
  label,
  value,
  onChange,
  sublabel,
  min,
  max,
  step = 15,
  chips,
  extraChip,
}: MinutesStepperProps) {
  const headingId = useId();

  function clamp(next: number) {
    onChange(Math.min(max, Math.max(min, next)));
  }

  return (
    <div>
      <p id={headingId} className="mb-2 text-sm font-medium">
        {label}
      </p>
      <fieldset className="m-0 flex items-center gap-4 border-0 p-0" aria-labelledby={headingId}>
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => clamp(value - step)}
          disabled={value <= min}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 text-lg font-medium transition-colors hover:bg-surface-muted disabled:opacity-40 dark:border-zinc-700"
        >
          −
        </button>
        <div className="min-w-28 text-center">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatMinutes(value)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{sublabel}</p>
        </div>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => clamp(value + step)}
          disabled={value >= max}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 text-lg font-medium transition-colors hover:bg-surface-muted disabled:opacity-40 dark:border-zinc-700"
        >
          +
        </button>
      </fieldset>
      {(chips || extraChip) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips?.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onChange(chip.minutes)}
              aria-pressed={value === chip.minutes}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
                value === chip.minutes
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-zinc-300 text-zinc-700 hover:bg-surface-muted dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
          {extraChip && (
            <button
              type="button"
              onClick={extraChip.onSelect}
              aria-pressed={extraChip.selected}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
                extraChip.selected
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-zinc-300 text-zinc-700 hover:bg-surface-muted dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              {extraChip.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
