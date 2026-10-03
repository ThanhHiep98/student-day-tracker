import { MINUTES_PER_DAY } from './activity-span';
import type { HabitGoalsFields } from './build-habit-goals';

/** A free day has at least this much time left before the "Tight day" hint (D7). */
export const TIGHT_DAY_THRESHOLD_MINUTES = 120;

export interface DayBudgetSegment {
  key: 'sleep' | 'school' | 'extraClass' | 'selfStudy' | 'meals' | 'entertainment';
  label: string;
  /** The category this goal currently counts toward ("Counts toward ▾"). */
  categoryId: string;
  minutes: number;
  /** Entertainment is a cap ("at most"), not a target. */
  isCap: boolean;
}

export interface DayBudget {
  segments: DayBudgetSegment[];
  /** Sum of every segment, including entertainment's cap (0 when "no limit"). */
  totalMinutes: number;
  /** `24h - totalMinutes`; negative once the plan is over budget. */
  freeMinutes: number;
  /** D7: less than 2h left, but saving is still allowed. */
  tight: boolean;
  /** Review ⑦: > 24h blocks saving (this total includes entertainment, unlike buildHabitGoals' D6 check). */
  overBudget: boolean;
}

function schoolMinutes(school: HabitGoalsFields['school']): number {
  return school.blocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);
}

/**
 * The 24h stacked bar on the review screen (ADR-008 §1.2 ⑦): one segment per
 * goal area, free time left, and the tight-day / over-budget flags. Pure —
 * takes whatever fields the wizard has collected so far (every section always
 * has a value: saved, or the D3 suggestion).
 */
export function getDayBudget(fields: HabitGoalsFields): DayBudget {
  const segments: DayBudgetSegment[] = [
    {
      key: 'sleep',
      label: 'Sleep',
      categoryId: fields.sleep.categoryId,
      minutes: fields.sleep.targetMinutes,
      isCap: false,
    },
    {
      key: 'school',
      label: 'School',
      categoryId: fields.school.categoryId,
      minutes: schoolMinutes(fields.school),
      isCap: false,
    },
    {
      key: 'extraClass',
      label: 'Extra class',
      categoryId: fields.extraClass.categoryId,
      minutes: fields.extraClass.targetMinutesPerDay,
      isCap: false,
    },
    {
      key: 'selfStudy',
      label: 'Self-study',
      categoryId: fields.selfStudy.categoryId,
      minutes: fields.selfStudy.targetMinutesPerDay,
      isCap: false,
    },
    {
      key: 'meals',
      label: 'Meals',
      categoryId: fields.meals.categoryId,
      minutes: fields.meals.targetMinutesPerDay,
      isCap: false,
    },
    {
      key: 'entertainment',
      label: 'Entertainment',
      categoryId: fields.entertainment.categoryId,
      minutes: fields.entertainment.maxMinutesPerDay ?? 0,
      isCap: true,
    },
  ];
  const totalMinutes = segments.reduce((sum, s) => sum + s.minutes, 0);
  const freeMinutes = MINUTES_PER_DAY - totalMinutes;
  return {
    segments,
    totalMinutes,
    freeMinutes,
    tight: freeMinutes >= 0 && freeMinutes < TIGHT_DAY_THRESHOLD_MINUTES,
    overBudget: totalMinutes > MINUTES_PER_DAY,
  };
}
