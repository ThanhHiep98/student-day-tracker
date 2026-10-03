import { describe, expect, it } from 'vitest';
import { getDayBudget } from './get-day-budget';
import { suggestedHabitGoals } from './suggested-habit-goals';

describe('getDayBudget', () => {
  it('matches the review screen ⑦: 23h planned, 1h free, tight', () => {
    const budget = getDayBudget(suggestedHabitGoals());
    expect(budget.segments.map((s) => [s.label, s.minutes])).toEqual([
      ['Sleep', 450],
      ['School', 450],
      ['Extra class', 120],
      ['Self-study', 180],
      ['Meals', 90],
      ['Entertainment', 90],
    ]);
    expect(budget.totalMinutes).toBe(1380);
    expect(budget.freeMinutes).toBe(60);
    expect(budget.tight).toBe(true);
    expect(budget.overBudget).toBe(false);
  });

  it('treats "no limit" entertainment as a zero-minute segment', () => {
    const s = suggestedHabitGoals();
    const budget = getDayBudget({
      ...s,
      entertainment: { ...s.entertainment, maxMinutesPerDay: null },
    });
    expect(budget.segments.at(-1)).toMatchObject({
      label: 'Entertainment',
      minutes: 0,
      isCap: true,
    });
    expect(budget.totalMinutes).toBe(1290);
  });

  it('is not tight at exactly 2h free, and tight at 1h59m free', () => {
    const s = suggestedHabitGoals();
    const twoHoursFree = { ...s, meals: { ...s.meals, targetMinutesPerDay: 30 } };
    expect(getDayBudget(twoHoursFree).freeMinutes).toBe(120);
    expect(getDayBudget(twoHoursFree).tight).toBe(false);

    const justUnderTwoHours = { ...s, meals: { ...s.meals, targetMinutesPerDay: 31 } };
    expect(getDayBudget(justUnderTwoHours).freeMinutes).toBe(119);
    expect(getDayBudget(justUnderTwoHours).tight).toBe(true);
  });

  it('flags overBudget once the total (including entertainment) exceeds 24h', () => {
    const s = suggestedHabitGoals();
    const atLimit = { ...s, meals: { ...s.meals, targetMinutesPerDay: 150 } };
    expect(getDayBudget(atLimit).totalMinutes).toBe(1440);
    expect(getDayBudget(atLimit).overBudget).toBe(false);
    expect(getDayBudget(atLimit).tight).toBe(true);

    const over = { ...s, meals: { ...s.meals, targetMinutesPerDay: 151 } };
    expect(getDayBudget(over).overBudget).toBe(true);
  });

  it('sums both school blocks into the School segment', () => {
    const s = suggestedHabitGoals();
    expect(getDayBudget(s).segments[1].minutes).toBe(270 + 180);
  });
});
