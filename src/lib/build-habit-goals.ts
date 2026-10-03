import type { Category, HabitGoals } from './types';

/**
 * The six answerable sections of the questionnaire (ADR-008 §2.3), without
 * the envelope fields (`version`, `status`, `lastStep`, timestamps) that the
 * caller tracks separately — mirrors `ActivityInput` next to `Activity` in
 * build-activity.ts.
 */
export interface HabitGoalsFields {
  sleep: HabitGoals['sleep'];
  school: HabitGoals['school'];
  extraClass: HabitGoals['extraClass'];
  selfStudy: HabitGoals['selfStudy'];
  meals: HabitGoals['meals'];
  entertainment: HabitGoals['entertainment'];
}

export interface HabitGoalsMeta {
  status: HabitGoals['status'];
  lastStep: HabitGoals['lastStep'];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

// D6 (ADR-008 §2.2) — plausible ranges, mirrored by firestore.rules.
const SLEEP_MIN = 4 * 60;
const SLEEP_MAX = 12 * 60;
const EXTRA_CLASS_MAX = 8 * 60;
const SELF_STUDY_MAX = 10 * 60;
const MEALS_MIN = 15;
const MEALS_MAX = 4 * 60;
const ENTERTAINMENT_MAX = 12 * 60;
const SCHOOL_WINDOW_START = 5 * 60; // 05:00
const SCHOOL_WINDOW_END = 22 * 60; // 22:00
const SCHOOL_MAX_BLOCKS = 2;
const PLANNED_DAY_MAX = 24 * 60;

function isMinuteOfDay(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 1439;
}

function requireCategory(categoryId: string, categories: Category[], label: string): void {
  if (!categories.some((c) => c.id === categoryId)) {
    throw new Error(`Choose a category for ${label}.`);
  }
}

function schoolMinutes(school: HabitGoals['school']): number {
  return school.blocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);
}

function validateSleep(sleep: HabitGoals['sleep'], categories: Category[]): void {
  if (sleep.targetMinutes < SLEEP_MIN || sleep.targetMinutes > SLEEP_MAX) {
    throw new Error('Sleep target must be between 4 and 12 hours.');
  }
  if (!isMinuteOfDay(sleep.bedtimeMinutes)) throw new Error('Choose a valid bedtime.');
  requireCategory(sleep.categoryId, categories, 'sleep');
}

function validateSchool(school: HabitGoals['school'], categories: Category[]): void {
  if (!school.days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) {
    throw new Error('School days must be Monday (1) through Sunday (7).');
  }
  if (new Set(school.days).size !== school.days.length) {
    throw new Error('Choose each school day once.');
  }
  if (school.blocks.length > SCHOOL_MAX_BLOCKS) {
    throw new Error(`School time is at most ${SCHOOL_MAX_BLOCKS} blocks a day.`);
  }
  const sorted = [...school.blocks].sort((a, b) => a.startMinutes - b.startMinutes);
  for (let i = 0; i < sorted.length; i++) {
    const block = sorted[i];
    if (
      block.startMinutes < SCHOOL_WINDOW_START ||
      block.endMinutes > SCHOOL_WINDOW_END ||
      block.endMinutes <= block.startMinutes
    ) {
      throw new Error('School blocks must fall between 05:00 and 22:00, ending after they start.');
    }
    const next = sorted[i + 1];
    if (next && next.startMinutes < block.endMinutes) {
      throw new Error("School blocks can't overlap.");
    }
  }
  requireCategory(school.categoryId, categories, 'school');
}

function validateExtraClass(extraClass: HabitGoals['extraClass'], categories: Category[]): void {
  if (extraClass.targetMinutesPerDay < 0 || extraClass.targetMinutesPerDay > EXTRA_CLASS_MAX) {
    throw new Error('Extra class must be between 0 and 8 hours a day.');
  }
  requireCategory(extraClass.categoryId, categories, 'extra class');
}

function validateSelfStudy(selfStudy: HabitGoals['selfStudy'], categories: Category[]): void {
  if (selfStudy.targetMinutesPerDay < 0 || selfStudy.targetMinutesPerDay > SELF_STUDY_MAX) {
    throw new Error('Self-study must be between 0 and 10 hours a day.');
  }
  requireCategory(selfStudy.categoryId, categories, 'self-study');
}

function validateMeals(meals: HabitGoals['meals'], categories: Category[]): void {
  if (meals.targetMinutesPerDay < MEALS_MIN || meals.targetMinutesPerDay > MEALS_MAX) {
    throw new Error('Meals must be between 15 minutes and 4 hours a day.');
  }
  requireCategory(meals.categoryId, categories, 'meals');
}

function validateEntertainment(
  entertainment: HabitGoals['entertainment'],
  categories: Category[]
): void {
  const max = entertainment.maxMinutesPerDay;
  if (max !== null && (max < 0 || max > ENTERTAINMENT_MAX)) {
    throw new Error('Entertainment must be between 0 and 12 hours a day, or no limit.');
  }
  requireCategory(entertainment.categoryId, categories, 'entertainment');
}

/**
 * Validate and assemble the `users/{uid}/goals/habits` document (ADR-008
 * §2.3/§2.5). Pure — throws a user-facing message on the first D6 violation
 * (mirrored by firestore.rules); the caller (wizard, Habits & goals page)
 * persists the result via `saveHabitGoals`.
 *
 * The 24h total check excludes entertainment (it is a cap, not a target) —
 * the review screen's own "> 24h, including entertainment" check is a UI
 * concern (`getDayBudget`), not a hard validation rule.
 */
export function buildHabitGoals(
  fields: HabitGoalsFields,
  categories: Category[],
  meta: HabitGoalsMeta
): HabitGoals {
  validateSleep(fields.sleep, categories);
  validateSchool(fields.school, categories);
  validateExtraClass(fields.extraClass, categories);
  validateSelfStudy(fields.selfStudy, categories);
  validateMeals(fields.meals, categories);
  validateEntertainment(fields.entertainment, categories);

  const plannedExclEntertainment =
    fields.sleep.targetMinutes +
    schoolMinutes(fields.school) +
    fields.extraClass.targetMinutesPerDay +
    fields.selfStudy.targetMinutesPerDay +
    fields.meals.targetMinutesPerDay;
  if (plannedExclEntertainment > PLANNED_DAY_MAX) {
    throw new Error('Your daily plan adds up to more than 24 hours. Lower a target.');
  }

  const goals: HabitGoals = {
    version: 1,
    status: meta.status,
    lastStep: meta.lastStep,
    sleep: fields.sleep,
    school: fields.school,
    extraClass: fields.extraClass,
    selfStudy: fields.selfStudy,
    meals: fields.meals,
    entertainment: fields.entertainment,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
  if (meta.completedAt !== undefined) goals.completedAt = meta.completedAt;
  return goals;
}
