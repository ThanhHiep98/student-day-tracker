'use client';

import { CategoryMapSelect } from '@/components/category-map-select';
import type { Category, HabitGoals } from '@/lib/types';
import { MinutesStepper } from './minutes-stepper';
import { SuggestionHint } from './suggestion-hint';

interface StudyQuestionProps {
  extraClass: HabitGoals['extraClass'];
  selfStudy: HabitGoals['selfStudy'];
  onChangeExtraClass: (value: HabitGoals['extraClass']) => void;
  onChangeSelfStudy: (value: HabitGoals['selfStudy']) => void;
  categories: Category[];
  /** Habits & goals ⑨: hide the wizard's heading/description/hint. */
  compact?: boolean;
}

/** ④ Q3 Study outside class (ADR-008 §1.2): học thêm + tự học, each its own category. */
export function StudyQuestion({
  extraClass,
  selfStudy,
  onChangeExtraClass,
  onChangeSelfStudy,
  categories,
  compact,
}: StudyQuestionProps) {
  return (
    <div className="flex flex-col gap-5">
      {!compact && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            How much do you want to study outside class?
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Split between extra classes (học thêm) and studying on your own (tự học).
          </p>
        </div>
      )}

      <MinutesStepper
        label="Extra class per day"
        sublabel="học thêm"
        value={extraClass.targetMinutesPerDay}
        onChange={(targetMinutesPerDay) =>
          onChangeExtraClass({ ...extraClass, targetMinutesPerDay })
        }
        min={0}
        max={480}
      />
      <CategoryMapSelect
        categories={categories}
        value={extraClass.categoryId}
        onChange={(categoryId) => onChangeExtraClass({ ...extraClass, categoryId })}
      />

      <hr className="border-border" />

      <MinutesStepper
        label="Self-study per day"
        sublabel="tự học"
        value={selfStudy.targetMinutesPerDay}
        onChange={(targetMinutesPerDay) => onChangeSelfStudy({ ...selfStudy, targetMinutesPerDay })}
        min={0}
        max={600}
      />
      <CategoryMapSelect
        categories={categories}
        value={selfStudy.categoryId}
        onChange={(categoryId) => onChangeSelfStudy({ ...selfStudy, categoryId })}
      />

      {!compact && (
        <SuggestionHint>Suggested for lớp 12: 4–5h of study outside class in total.</SuggestionHint>
      )}
    </div>
  );
}
