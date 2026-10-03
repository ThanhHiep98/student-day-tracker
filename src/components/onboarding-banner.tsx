'use client';

import { openOnboardingWizard } from '@/lib/use-onboarding-wizard';

const TOTAL_QUESTIONS = 5;

interface OnboardingBannerProps {
  /** The saved `lastStep` (0-5) to resume at. */
  lastStep: number;
}

/**
 * Home banner ⑧ (ADR-008 §1.2): shown while the questionnaire was skipped or
 * left unfinished. "Continue (n of 5)" resumes at the saved step; it
 * disappears once the plan is saved (status becomes 'completed' — the caller
 * decides when to render this at all).
 */
export function OnboardingBanner({ lastStep }: OnboardingBannerProps) {
  const resumeStep = Math.min(lastStep + 1, TOTAL_QUESTIONS);
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-indigo-900 dark:bg-indigo-950/40">
      <p className="text-indigo-900 dark:text-indigo-100">
        <span aria-hidden className="mr-1.5">
          🎯
        </span>
        <strong className="font-semibold">Finish setting up your day</strong> — answer 5 quick
        questions so we can show warnings and your % hiệu quả.
      </p>
      <button
        type="button"
        onClick={() => openOnboardingWizard(resumeStep)}
        className="shrink-0 rounded-full border border-indigo-300 bg-white px-4 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
      >
        Continue ({resumeStep} of {TOTAL_QUESTIONS})
      </button>
    </div>
  );
}
