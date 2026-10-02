import type { Activity, Category, IsoDate } from './types';

/** The user-editable fields of an activity, as submitted by the Add/Edit form. */
export interface ActivityInput {
  name: string;
  categoryId: string;
  startMinutes: number;
  endMinutes: number;
}

export interface ActivityMeta {
  id: string;
  createdAt: number;
  date: IsoDate;
}

const LAST_MINUTE_OF_DAY = 1439;

function isMinuteOfDay(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= LAST_MINUTE_OF_DAY;
}

/**
 * Validate form input against req. 1.3 (plan §2.2 D5) and return the
 * normalized editable fields. Throws with a user-facing message; overlap
 * with other activities is intentionally not checked.
 */
function validateActivityInput(input: ActivityInput, categories: Category[]): ActivityInput {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required.');
  if (!categories.some((c) => c.id === input.categoryId)) throw new Error('Choose a category.');
  if (!isMinuteOfDay(input.startMinutes) || !isMinuteOfDay(input.endMinutes)) {
    throw new Error('Enter a valid start and end time.');
  }
  if (input.endMinutes <= input.startMinutes) {
    throw new Error('End time must be after start time.');
  }
  return {
    name,
    categoryId: input.categoryId,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
  };
}

/**
 * Build a new Activity row. Pure — `id`, `createdAt` and `date` are passed
 * in; the caller does the `db.activities.add`.
 */
export function buildActivity(
  input: ActivityInput,
  categories: Category[],
  meta: ActivityMeta
): Activity {
  return { ...validateActivityInput(input, categories), ...meta };
}

/**
 * Apply an edit to an existing Activity. `id`, `date` and `createdAt` are
 * kept (so an edited demo- row stays a demo row). Caller does `db.activities.put`.
 */
export function buildUpdatedActivity(
  existing: Activity,
  input: ActivityInput,
  categories: Category[]
): Activity {
  return { ...existing, ...validateActivityInput(input, categories) };
}
