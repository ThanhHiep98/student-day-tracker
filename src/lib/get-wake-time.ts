import { MINUTES_PER_DAY } from './activity-span';

/**
 * Derived wake-up time for the sleep question (ADR-008 §1.2 ②): bedtime plus
 * the sleep target, wrapping past midnight — the same minutes-of-day math as
 * `spanDurationMinutes`, just the inverse (start + duration instead of
 * end - start).
 */
export function getWakeTime(bedtimeMinutes: number, sleepTargetMinutes: number): number {
  return (bedtimeMinutes + sleepTargetMinutes) % MINUTES_PER_DAY;
}
