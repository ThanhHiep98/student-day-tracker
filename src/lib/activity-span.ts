import type { ActivityInput } from './build-activity';
import type { Activity } from './types';

/** `endMinutes` value meaning "ends at midnight" (end-exclusive). */
export const MINUTES_PER_DAY = 1440;

/**
 * A cross-midnight activity is stored as two per-day rows sharing `spanId`
 * (= the head row's id). The tail is the row on the next day, starting at 00:00.
 */
export function isSpanTail(activity: Pick<Activity, 'id' | 'spanId'>): boolean {
  return activity.spanId !== undefined && activity.spanId !== activity.id;
}

/** Key that identifies one logical session: both rows of a span share it. */
export function sessionKey(activity: Pick<Activity, 'id' | 'spanId'>): string {
  return activity.spanId ?? activity.id;
}

/**
 * Duration of a form's start → end clock times in minutes, where an end
 * earlier than the start wraps past midnight. Equal times give 0.
 */
export function spanDurationMinutes(startMinutes: number, endMinutes: number): number {
  return (endMinutes - startMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/**
 * Read the stored row(s) of one activity back as form input: the head's date
 * and start, the last row's end. An end of 1440 (midnight) reads as 00:00.
 * Rows may come in any order.
 */
export function mergeActivitySpan(rows: Activity[]): ActivityInput {
  if (rows.length === 0) throw new Error('Cannot merge an empty activity span.');
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const head = ordered[0];
  const last = ordered[ordered.length - 1];
  return {
    name: head.name,
    categoryId: head.categoryId,
    date: head.date,
    startMinutes: head.startMinutes,
    endMinutes: last.endMinutes % MINUTES_PER_DAY,
  };
}
