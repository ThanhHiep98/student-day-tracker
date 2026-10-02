import { MINUTES_PER_DAY, isSpanTail } from './activity-span';
import { addDays, isIsoDate } from './iso-date';
import type { Activity, Category, IsoDate } from './types';

/**
 * The user-editable fields of an activity, as submitted by the Add/Edit form.
 * `date` is the start date; `startMinutes`/`endMinutes` are clock times
 * (0-1439). An end earlier than the start means "ends the next day"; an end
 * of 0 (00:00) means "ends at midnight" on the start date.
 */
export interface ActivityInput {
  name: string;
  categoryId: string;
  date: IsoDate;
  startMinutes: number;
  endMinutes: number;
}

export interface ActivityMeta {
  id: string;
  createdAt: number;
}

/** Result of an edit: rows to `bulkPut` and stale row ids to `bulkDelete`, in one transaction. */
export interface ActivityUpdate {
  put: Activity[];
  deleteIds: string[];
}

const LAST_MINUTE_OF_DAY = MINUTES_PER_DAY - 1;
const TAIL_ID_SUFFIX = '-next';

function isMinuteOfDay(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= LAST_MINUTE_OF_DAY;
}

/**
 * Validate form input against req. 1.3 and the cross-midnight rule
 * (plans/2026-10-01-v2-roadmap-cross-midnight.html). Throws with a
 * user-facing message; overlap with other activities is intentionally not
 * checked.
 */
function validateActivityInput(input: ActivityInput, categories: Category[]): ActivityInput {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required.');
  if (!categories.some((c) => c.id === input.categoryId)) throw new Error('Choose a category.');
  if (!isIsoDate(input.date)) throw new Error('Choose a valid date.');
  if (!isMinuteOfDay(input.startMinutes) || !isMinuteOfDay(input.endMinutes)) {
    throw new Error('Enter a valid start and end time.');
  }
  if (input.endMinutes === input.startMinutes) {
    throw new Error("Start and end time can't be the same.");
  }
  return {
    name,
    categoryId: input.categoryId,
    date: input.date,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
  };
}

/**
 * Turn validated input into stored rows. Same-day (or ending exactly at
 * 00:00, stored as 1440) → one row without `spanId`. Otherwise a head row
 * `start–1440` on `date` and a tail row `0–end` on the next day, both with
 * `spanId` = head id; the tail id is `${headId}-next`.
 */
function toRows(input: ActivityInput, meta: ActivityMeta): Activity[] {
  const { name, categoryId, date, startMinutes, endMinutes } = input;
  const common = { name, categoryId, createdAt: meta.createdAt };
  if (endMinutes === 0 || endMinutes > startMinutes) {
    return [
      {
        ...common,
        id: meta.id,
        date,
        startMinutes,
        endMinutes: endMinutes === 0 ? MINUTES_PER_DAY : endMinutes,
      },
    ];
  }
  return [
    {
      ...common,
      id: meta.id,
      spanId: meta.id,
      date,
      startMinutes,
      endMinutes: MINUTES_PER_DAY,
    },
    {
      ...common,
      id: `${meta.id}${TAIL_ID_SUFFIX}`,
      spanId: meta.id,
      date: addDays(date, 1),
      startMinutes: 0,
      endMinutes,
    },
  ];
}

/**
 * Build the row(s) for a new activity: one row, or two for a cross-midnight
 * span. Pure — `id` and `createdAt` are passed in; the caller does the
 * `db.activities.bulkAdd`.
 */
export function buildActivity(
  input: ActivityInput,
  categories: Category[],
  meta: ActivityMeta
): Activity[] {
  return toRows(validateActivityInput(input, categories), meta);
}

/**
 * Apply an edit to all stored rows of one activity (1 row, or both rows of a
 * span, in any order). Keeps the head's `id` and `createdAt` (so an edited
 * demo- row stays a demo row). Old rows that the new shape no longer uses
 * (a tail, when a span becomes same-day) come back in `deleteIds`.
 */
export function buildUpdatedActivity(
  existingRows: Activity[],
  input: ActivityInput,
  categories: Category[]
): ActivityUpdate {
  const head = existingRows.find((row) => !isSpanTail(row));
  if (!head) throw new Error('Activity not found.');
  const put = toRows(validateActivityInput(input, categories), {
    id: head.id,
    createdAt: head.createdAt,
  });
  const keep = new Set(put.map((row) => row.id));
  const deleteIds = existingRows.map((row) => row.id).filter((id) => !keep.has(id));
  return { put, deleteIds };
}
