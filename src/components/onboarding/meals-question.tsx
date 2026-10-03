'use client';

import { CategoryMapSelect } from '@/components/category-map-select';
import type { Category, HabitGoals } from '@/lib/types';
import { MinutesStepper } from './minutes-stepper';

interface MealsQuestionProps {
  value: HabitGoals['meals'];
  onChange: (value: HabitGoals['meals']) => void;
  categories: Category[];
  /** Habits & goals ⑨: hide the wizard's heading/description. */
  compact?: boolean;
}

/** ⑤ Q4 Meals (ADR-008 §1.2): all meals in a day together. */
export function MealsQuestion({ value, onChange, categories, compact }: MealsQuestionProps) {
  return (
    <div className="flex flex-col gap-5">
      {!compact && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">How long do meals take?</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">All meals in a day together.</p>
        </div>
      )}

      <MinutesStepper
        label="Meals per day"
        sublabel="breakfast + lunch + dinner"
        value={value.targetMinutesPerDay}
        onChange={(targetMinutesPerDay) => onChange({ ...value, targetMinutesPerDay })}
        min={15}
        max={240}
        chips={[
          { label: '1h', minutes: 60 },
          { label: '1h 30m', minutes: 90 },
          { label: '2h', minutes: 120 },
        ]}
      />

      <CategoryMapSelect
        categories={categories}
        value={value.categoryId}
        onChange={(categoryId) => onChange({ ...value, categoryId })}
      />
    </div>
  );
}
