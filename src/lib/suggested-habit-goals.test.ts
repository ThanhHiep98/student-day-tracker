import { describe, expect, it } from 'vitest';
import { buildHabitGoals } from './build-habit-goals';
import { DEFAULT_CATEGORIES } from './default-categories';
import { getWakeTime } from './get-wake-time';
import { suggestedHabitGoals } from './suggested-habit-goals';

describe('suggestedHabitGoals', () => {
  it('matches the D3 lớp 12 defaults (ADR-008 §2.2 / §1.2 ②–⑥)', () => {
    const s = suggestedHabitGoals();
    expect(s.sleep).toEqual({ targetMinutes: 450, bedtimeMinutes: 1380, categoryId: 'sleep' });
    expect(s.school.days).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s.school.blocks).toEqual([
      { startMinutes: 420, endMinutes: 690 },
      { startMinutes: 810, endMinutes: 990 },
    ]);
    expect(s.extraClass.targetMinutesPerDay).toBe(120);
    expect(s.selfStudy.targetMinutesPerDay).toBe(180);
    expect(s.meals.targetMinutesPerDay).toBe(90);
    expect(s.entertainment).toEqual({ maxMinutesPerDay: 90, categoryId: 'entertainment' });
  });

  it('bedtime 23:00 + 7h30 wakes at 06:30', () => {
    const s = suggestedHabitGoals();
    expect(getWakeTime(s.sleep.bedtimeMinutes, s.sleep.targetMinutes)).toBe(6 * 60 + 30);
  });

  it('maps every section to one of the five new default categories', () => {
    const s = suggestedHabitGoals();
    expect([
      s.sleep.categoryId,
      s.school.categoryId,
      s.extraClass.categoryId,
      s.selfStudy.categoryId,
      s.meals.categoryId,
      s.entertainment.categoryId,
    ]).toEqual(['sleep', 'school', 'extra-class', 'self-study', 'meals', 'entertainment']);
  });

  it('is a valid, buildable set of goals on its own', () => {
    expect(() =>
      buildHabitGoals(suggestedHabitGoals(), [...DEFAULT_CATEGORIES], {
        status: 'completed',
        lastStep: 5,
        createdAt: 0,
        updatedAt: 0,
      })
    ).not.toThrow();
  });
});
