'use client';

import { EntertainmentQuestion } from '@/components/onboarding/entertainment-question';
import { MealsQuestion } from '@/components/onboarding/meals-question';
import { ReviewStep } from '@/components/onboarding/review-step';
import { SchoolQuestion } from '@/components/onboarding/school-question';
import { SleepQuestion } from '@/components/onboarding/sleep-question';
import { StudyQuestion } from '@/components/onboarding/study-question';
import { type HabitGoalsFields, buildHabitGoals } from '@/lib/build-habit-goals';
import type { UserScope } from '@/lib/firestore-paths';
import { getDayBudget } from '@/lib/get-day-budget';
import { saveHabitGoals } from '@/lib/habit-goals-writes';
import { suggestedHabitGoals } from '@/lib/suggested-habit-goals';
import type { Category, HabitGoals } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';

const TOTAL_QUESTIONS = 5;
const STEP_TITLE: Record<number, string> = {
  1: 'Sleep',
  2: 'School',
  3: 'Study outside class',
  4: 'Meals',
  5: 'Entertainment',
  6: 'Review your plan',
};
const WELCOME_GOALS: { icon: string; label: string }[] = [
  { icon: '😴', label: 'Sleep' },
  { icon: '🏫', label: 'School' },
  { icon: '📝', label: 'Extra class' },
  { icon: '📖', label: 'Self-study' },
  { icon: '🍚', label: 'Meals' },
  { icon: '🎮', label: 'Entertainment' },
];

function fieldsFrom(existing: HabitGoals | null): HabitGoalsFields {
  if (!existing) return suggestedHabitGoals();
  const { sleep, school, extraClass, selfStudy, meals, entertainment } = existing;
  return { sleep, school, extraClass, selfStudy, meals, entertainment };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

interface OnboardingWizardProps {
  scope: UserScope;
  categories: Category[];
  existing: HabitGoals | null;
  /** 0 = Welcome, 1-5 = Q1-Q5 (resume point, e.g. the Home banner's `lastStep`). */
  startStep: number;
  givenName: string | null;
  onDone: () => void;
}

/**
 * The first-run questionnaire (ADR-008 §1.2 ①–⑦): welcome → 5 questions →
 * review. Every section always has a value (saved, or the D3 suggestion), so
 * a step reached by skipping ahead is never blank, and every Next/Save is a
 * full, valid `HabitGoalsFields` — `buildHabitGoals` only ever rejects a
 * genuinely invalid edit (its own inline error is a safety net; the inputs
 * already clamp to the valid range).
 */
export function OnboardingWizard({
  scope,
  categories,
  existing,
  startStep,
  givenName,
  onDone,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(() => Math.min(Math.max(startStep, 0), 6));
  const [fields, setFields] = useState<HabitGoalsFields>(() => fieldsFrom(existing));
  const [error, setError] = useState<string | null>(null);
  const createdAtRef = useRef(existing?.createdAt ?? Date.now());
  const stepRef = useRef<HTMLDivElement>(null);

  // Focus moves to the step's content on change (task 1.3) — a plain
  // imperative focus move, not a focus trap (this isn't a dialog).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `step` isn't read, it's the trigger to refocus on every step change
  useEffect(() => {
    stepRef.current?.focus();
  }, [step]);

  function persist(status: HabitGoals['status'], lastStep: HabitGoals['lastStep']): void {
    const now = Date.now();
    const goals = buildHabitGoals(fields, categories, {
      status,
      lastStep,
      createdAt: createdAtRef.current,
      updatedAt: now,
      ...(status === 'completed' ? { completedAt: now } : {}),
    });
    saveHabitGoals(scope, goals);
  }

  function handleSkip() {
    try {
      persist('skipped', (step === 0 ? 0 : step - 1) as HabitGoals['lastStep']);
    } catch (err) {
      console.warn('Could not record the skip; it will show as not started', err);
    }
    onDone();
  }

  function handleNext() {
    try {
      persist('in-progress', step as HabitGoals['lastStep']);
      setError(null);
      setStep((s) => s + 1);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleSave() {
    try {
      persist('completed', 5);
      setError(null);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const overBudget = getDayBudget(fields).overBudget;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-8">
      <div className="w-full rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white"
          >
            🕒
          </span>
          {step < 6 && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Skip for now
            </button>
          )}
        </div>

        {step >= 1 && step <= 5 && (
          <div className="mt-5">
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                <span
                  key={`step-${i + 1}`}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < step ? 'bg-indigo-600' : 'bg-surface-muted'
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Question {step} of {TOTAL_QUESTIONS}
            </p>
          </div>
        )}

        <div ref={stepRef} tabIndex={-1} className="mt-5 outline-none">
          {step > 0 && (
            // Each step replaces the whole page (no app shell underneath), so
            // it needs its own level-one heading; the step's own, visible h2
            // ("How much sleep…") stays the prominent in-flow heading.
            <h1 className="sr-only">{STEP_TITLE[step]}</h1>
          )}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Let&apos;s set up your day{givenName ? `, ${givenName}` : ''}
                </h1>
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                  5 quick questions about your ideal day — sleep, school, study, meals and free
                  time. About a minute. You can change everything later.
                </p>
              </div>
              <ul className="flex flex-col gap-3">
                {WELCOME_GOALS.map((g) => (
                  <li key={g.label} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-9 items-center justify-center rounded-xl bg-surface-muted text-lg"
                    >
                      {g.icon}
                    </span>
                    <span className="font-medium">{g.label}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                We use your answers to warn you gently when a day drifts off plan and to show how
                close you get (% hiệu quả).
              </p>
            </div>
          )}

          {step === 1 && (
            <SleepQuestion
              value={fields.sleep}
              onChange={(sleep) => setFields((f) => ({ ...f, sleep }))}
              categories={categories}
            />
          )}
          {step === 2 && (
            <SchoolQuestion
              value={fields.school}
              onChange={(school) => setFields((f) => ({ ...f, school }))}
              categories={categories}
            />
          )}
          {step === 3 && (
            <StudyQuestion
              extraClass={fields.extraClass}
              selfStudy={fields.selfStudy}
              onChangeExtraClass={(extraClass) => setFields((f) => ({ ...f, extraClass }))}
              onChangeSelfStudy={(selfStudy) => setFields((f) => ({ ...f, selfStudy }))}
              categories={categories}
            />
          )}
          {step === 4 && (
            <MealsQuestion
              value={fields.meals}
              onChange={(meals) => setFields((f) => ({ ...f, meals }))}
              categories={categories}
            />
          )}
          {step === 5 && (
            <EntertainmentQuestion
              value={fields.entertainment}
              onChange={(entertainment) => setFields((f) => ({ ...f, entertainment }))}
              categories={categories}
            />
          )}
          {step === 6 && <ReviewStep fields={fields} categories={categories} onEdit={setStep} />}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="mt-7 flex justify-between gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-surface-muted dark:border-zinc-700 dark:text-zinc-300"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {step === 0 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Start
            </button>
          )}
          {step >= 1 && step <= 4 && (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Next
            </button>
          )}
          {step === 5 && (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Review
            </button>
          )}
          {step === 6 && (
            <button
              type="button"
              onClick={handleSave}
              disabled={overBudget}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Save my plan
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
