'use client';

import { CategoryMapSelect } from '@/components/category-map-select';
import { clockToMinutes, minutesToClock } from '@/lib/clock-time';
import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category, HabitGoals } from '@/lib/types';

const WEEKDAYS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 7, label: 'Sun' },
] as const;

interface SchoolQuestionProps {
  value: HabitGoals['school'];
  onChange: (value: HabitGoals['school']) => void;
  categories: Category[];
  /** Habits & goals ⑨: hide the wizard's heading/description (the page supplies its own row header). */
  compact?: boolean;
}

/**
 * ③ Q2 School (ADR-008 §1.2): school days + up to two time blocks (morning /
 * afternoon). A fixed pair of blocks, matching the approved mockup — D6
 * allows up to two.
 */
export function SchoolQuestion({ value, onChange, categories, compact }: SchoolQuestionProps) {
  const morning = value.blocks[0];
  const afternoon = value.blocks[1];

  function setBlock(index: 0 | 1, patch: Partial<{ startMinutes: number; endMinutes: number }>) {
    const blocks = [...value.blocks];
    blocks[index] = { ...blocks[index], ...patch };
    onChange({ ...value, blocks });
  }

  function toggleDay(day: number) {
    const days = value.days.includes(day)
      ? value.days.filter((d) => d !== day)
      : [...value.days, day].sort((a, b) => a - b);
    onChange({ ...value, days });
  }

  const totalMinutes = value.blocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);

  return (
    <div className="flex flex-col gap-5">
      {!compact && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">When are you at school?</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Class time on a normal school day.
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">School days</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map(({ day, label }) => {
            const selected = value.days.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={selected}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
                  selected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-zinc-300 text-zinc-700 hover:bg-surface-muted dark:border-zinc-700 dark:text-zinc-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="school-morning-from"
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            From
          </label>
          <input
            id="school-morning-from"
            type="time"
            value={minutesToClock(morning?.startMinutes ?? 420)}
            onChange={(e) => {
              const m = clockToMinutes(e.target.value);
              if (m !== null) setBlock(0, { startMinutes: m });
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label
            htmlFor="school-morning-to"
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            To
          </label>
          <input
            id="school-morning-to"
            type="time"
            value={minutesToClock(morning?.endMinutes ?? 690)}
            onChange={(e) => {
              const m = clockToMinutes(e.target.value);
              if (m !== null) setBlock(0, { endMinutes: m });
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label
            htmlFor="school-afternoon-from"
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Afternoon from
          </label>
          <input
            id="school-afternoon-from"
            type="time"
            value={minutesToClock(afternoon?.startMinutes ?? 810)}
            onChange={(e) => {
              const m = clockToMinutes(e.target.value);
              if (m !== null) setBlock(1, { startMinutes: m });
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label
            htmlFor="school-afternoon-to"
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            To
          </label>
          <input
            id="school-afternoon-to"
            type="time"
            value={minutesToClock(afternoon?.endMinutes ?? 990)}
            onChange={(e) => {
              const m = clockToMinutes(e.target.value);
              if (m !== null) setBlock(1, { endMinutes: m });
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        = <strong className="font-semibold text-foreground">{formatMinutes(totalMinutes)}</strong>{' '}
        at school per school day
      </p>

      <CategoryMapSelect
        categories={categories}
        value={value.categoryId}
        onChange={(categoryId) => onChange({ ...value, categoryId })}
      />
    </div>
  );
}
