'use client';

import { CategoryMapSelect } from '@/components/category-map-select';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { EntertainmentQuestion } from '@/components/onboarding/entertainment-question';
import { MealsQuestion } from '@/components/onboarding/meals-question';
import { SchoolQuestion } from '@/components/onboarding/school-question';
import { StudyQuestion } from '@/components/onboarding/study-question';
import { type HabitGoalsFields, buildHabitGoals } from '@/lib/build-habit-goals';
import { clockToMinutes, minutesToClock } from '@/lib/clock-time';
import { formatMinutes } from '@/lib/get-daily-summary';
import { saveHabitGoals } from '@/lib/habit-goals-writes';
import { suggestedHabitGoals } from '@/lib/suggested-habit-goals';
import type { Category, HabitGoals } from '@/lib/types';
import { useAuth } from '@/lib/use-auth';
import { useCategories } from '@/lib/use-categories';
import { useHabitGoals } from '@/lib/use-habit-goals';
import { openOnboardingWizard } from '@/lib/use-onboarding-wizard';
import { useEffect, useState } from 'react';

function fieldsFrom(existing: HabitGoals | null): HabitGoalsFields {
  if (!existing) return suggestedHabitGoals();
  const { sleep, school, extraClass, selfStudy, meals, entertainment } = existing;
  return { sleep, school, extraClass, selfStudy, meals, entertainment };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

function categoryOf(categories: Category[], id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

function Row({
  icon,
  title,
  categorySummary,
  children,
}: {
  icon: string;
  title: string;
  categorySummary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-5 last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-lg"
        >
          {icon}
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{categorySummary}</p>
        </div>
      </div>
      <div className="mt-4 pl-12">{children}</div>
    </div>
  );
}

/**
 * ⑨ Habits & goals (ADR-008 §1.2/§1.3): the same six fields as the wizard, in
 * one form, reachable from the account menu. "Re-run questionnaire" opens the
 * wizard at ① (prefilled from this page's saved values); Save overwrites
 * `users/{uid}/goals/habits` and marks onboarding completed (D8).
 */
export default function GoalsPage() {
  const { scope } = useAuth();
  const categories = useCategories();
  const existing = useHabitGoals();
  const [fields, setFields] = useState<HabitGoalsFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing !== undefined && fields === null) setFields(fieldsFrom(existing));
  }, [existing, fields]);

  if (fields === null || categories === undefined || !scope) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8">
        <LoadingSkeleton />
      </main>
    );
  }

  function handleSave() {
    if (!scope || !fields) return;
    try {
      const now = Date.now();
      const goals = buildHabitGoals(fields, categories ?? [], {
        status: 'completed',
        lastStep: 5,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        completedAt: existing?.status === 'completed' ? existing.completedAt : now,
      });
      saveHabitGoals(scope, goals);
      setError(null);
      setSaved(true);
    } catch (err) {
      setSaved(false);
      setError(errorMessage(err));
    }
  }

  const schoolTotal = fields.school.blocks.reduce(
    (sum, b) => sum + (b.endMinutes - b.startMinutes),
    0
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Habits &amp; goals</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Your ideal school day — warnings and % hiệu quả use these targets.
        </p>
      </header>

      <div className="mt-6 rounded-2xl border border-border bg-surface px-5">
        <Row
          icon="😴"
          title="Sleep per night"
          categorySummary={`Counts toward ${categoryOf(categories, fields.sleep.categoryId)?.name ?? fields.sleep.categoryId} · bed ${minutesToClock(fields.sleep.bedtimeMinutes)}`}
        >
          <SleepQuestionFields
            value={fields.sleep}
            onChange={(sleep) => setFields((f) => (f ? { ...f, sleep } : f))}
            categories={categories}
          />
        </Row>

        <Row
          icon="🏫"
          title="School"
          categorySummary={`Counts toward ${categoryOf(categories, fields.school.categoryId)?.name ?? fields.school.categoryId} · ${formatMinutes(schoolTotal)}`}
        >
          <SchoolQuestion
            value={fields.school}
            onChange={(school) => setFields((f) => (f ? { ...f, school } : f))}
            categories={categories}
            compact
          />
        </Row>

        <Row icon="📝" title="Extra class & self-study" categorySummary="Study outside class">
          <StudyQuestion
            extraClass={fields.extraClass}
            selfStudy={fields.selfStudy}
            onChangeExtraClass={(extraClass) => setFields((f) => (f ? { ...f, extraClass } : f))}
            onChangeSelfStudy={(selfStudy) => setFields((f) => (f ? { ...f, selfStudy } : f))}
            categories={categories}
            compact
          />
        </Row>

        <Row
          icon="🍚"
          title="Meals per day"
          categorySummary={`Counts toward ${categoryOf(categories, fields.meals.categoryId)?.name ?? fields.meals.categoryId}`}
        >
          <MealsQuestion
            value={fields.meals}
            onChange={(meals) => setFields((f) => (f ? { ...f, meals } : f))}
            categories={categories}
            compact
          />
        </Row>

        <Row
          icon="🎮"
          title="Entertainment, at most"
          categorySummary={`Counts toward ${categoryOf(categories, fields.entertainment.categoryId)?.name ?? fields.entertainment.categoryId}`}
        >
          <EntertainmentQuestion
            value={fields.entertainment}
            onChange={(entertainment) => setFields((f) => (f ? { ...f, entertainment } : f))}
            categories={categories}
            compact
          />
        </Row>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      {saved && !error && (
        <output className="mt-4 block text-sm text-emerald-700 dark:text-emerald-400">
          Saved.
        </output>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openOnboardingWizard(0)}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-surface-muted dark:border-zinc-700 dark:text-zinc-300"
        >
          Re-run questionnaire
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save
        </button>
      </div>
    </main>
  );
}

/** Just the stepper + bedtime input, without SleepQuestion's marketing heading. */
function SleepQuestionFields({
  value,
  onChange,
  categories,
}: {
  value: HabitGoals['sleep'];
  onChange: (value: HabitGoals['sleep']) => void;
  categories: Category[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="goals-sleep-target" className="text-sm text-zinc-600 dark:text-zinc-400">
          Target
        </label>
        <input
          id="goals-sleep-target"
          type="number"
          min={4}
          max={12}
          step={0.25}
          value={Math.round((value.targetMinutes / 60) * 100) / 100}
          onChange={(e) => {
            const hours = Number(e.target.value);
            if (!Number.isNaN(hours)) onChange({ ...value, targetMinutes: Math.round(hours * 60) });
          }}
          className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <span className="text-sm text-zinc-600 dark:text-zinc-400">hours</span>
        <label htmlFor="goals-sleep-bedtime" className="text-sm text-zinc-600 dark:text-zinc-400">
          Bedtime
        </label>
        <input
          id="goals-sleep-bedtime"
          type="time"
          value={minutesToClock(value.bedtimeMinutes)}
          onChange={(e) => {
            const minutes = clockToMinutes(e.target.value);
            if (minutes !== null) onChange({ ...value, bedtimeMinutes: minutes });
          }}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
      <CategoryMapSelect
        categories={categories}
        value={value.categoryId}
        onChange={(categoryId) => onChange({ ...value, categoryId })}
      />
    </div>
  );
}
