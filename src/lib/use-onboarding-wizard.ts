'use client';

import { useSyncExternalStore } from 'react';

/**
 * Lets a button anywhere in the app (the Home banner's "Continue", the
 * Habits & goals page's "Re-run questionnaire") ask the app shell
 * (auth-gate.tsx) to show the onboarding wizard at a given step — a small
 * module store, like use-sync-status.ts's write counter, instead of lifting
 * state through every page. `step` 0 = Welcome, 1-5 = Q1-Q5.
 */
let requestedStep: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openOnboardingWizard(step: number): void {
  requestedStep = step;
  emit();
}

/** Called by auth-gate.tsx once the wizard is skipped or the plan is saved. */
export function clearOnboardingWizardRequest(): void {
  requestedStep = null;
  emit();
}

export function useOnboardingWizardRequest(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => requestedStep,
    () => null
  );
}
