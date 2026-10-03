import { suggestedHabitGoals } from '../../../src/lib/suggested-habit-goals';
import type { HabitGoals } from '../../../src/lib/types';

/**
 * E2E fixture: a completed `users/{uid}/goals/habits` document (the lớp-12
 * suggested defaults, ADR-008 D3) — seeded directly so `evaluateDay`/
 * `evaluateWeek` (ADR-009 slice 4) have a baseline without driving the whole
 * onboarding wizard.
 */
export function sampleHabitGoals(now: number): HabitGoals {
  return {
    version: 1,
    status: 'completed',
    lastStep: 5,
    ...suggestedHabitGoals(),
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  };
}
