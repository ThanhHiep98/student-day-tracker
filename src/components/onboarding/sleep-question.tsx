'use client';

import { CategoryMapSelect } from '@/components/category-map-select';
import { clockToMinutes, minutesToClock } from '@/lib/clock-time';
import { getWakeTime } from '@/lib/get-wake-time';
import type { Category, HabitGoals } from '@/lib/types';
import { MinutesStepper } from './minutes-stepper';
import { SuggestionHint } from './suggestion-hint';

interface SleepQuestionProps {
  value: HabitGoals['sleep'];
  onChange: (value: HabitGoals['sleep']) => void;
  categories: Category[];
}

/** ② Q1 Sleep (ADR-008 §1.2): target hours + bedtime; wake-up is derived (slice 1 cross-midnight math). */
export function SleepQuestion({ value, onChange, categories }: SleepQuestionProps) {
  const wake = getWakeTime(value.bedtimeMinutes, value.targetMinutes);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          How much sleep do you want each night?
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Most students preparing for exams do best with 7–9 hours.
        </p>
      </div>

      <MinutesStepper
        label="Sleep per night"
        sublabel="target"
        value={value.targetMinutes}
        onChange={(targetMinutes) => onChange({ ...value, targetMinutes })}
        min={240}
        max={720}
        chips={[
          { label: '7h', minutes: 420 },
          { label: '7h 30m', minutes: 450 },
          { label: '8h', minutes: 480 },
          { label: '9h', minutes: 540 },
        ]}
      />

      <div>
        <label
          htmlFor="sleep-bedtime"
          className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          Usually go to bed at
        </label>
        <input
          id="sleep-bedtime"
          type="time"
          value={minutesToClock(value.bedtimeMinutes)}
          onChange={(e) => {
            const minutes = clockToMinutes(e.target.value);
            if (minutes !== null) onChange({ ...value, bedtimeMinutes: minutes });
          }}
          className="w-full max-w-48 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Wake-up time is worked out for you:{' '}
          <strong className="font-semibold">{minutesToClock(wake)}</strong>
        </p>
      </div>

      <SuggestionHint>Suggested for lớp 12: 7–8h, in bed by 23:00.</SuggestionHint>

      <CategoryMapSelect
        categories={categories}
        value={value.categoryId}
        onChange={(categoryId) => onChange({ ...value, categoryId })}
      />
    </div>
  );
}
