import type { HabitGoalsFields } from './build-habit-goals';

/**
 * D3 (ADR-008 §2.2): suggested answers for lớp 12, shown as the wizard's
 * prefill and as the green "Suggested for lớp 12" hint. One grade only — a
 * grade picker is out of scope for this slice.
 */
export function suggestedHabitGoals(): HabitGoalsFields {
  return {
    sleep: { targetMinutes: 7 * 60 + 30, bedtimeMinutes: 23 * 60, categoryId: 'sleep' },
    school: {
      days: [1, 2, 3, 4, 5, 6],
      blocks: [
        { startMinutes: 7 * 60, endMinutes: 11 * 60 + 30 },
        { startMinutes: 13 * 60 + 30, endMinutes: 16 * 60 + 30 },
      ],
      categoryId: 'school',
    },
    extraClass: { targetMinutesPerDay: 2 * 60, categoryId: 'extra-class' },
    selfStudy: { targetMinutesPerDay: 3 * 60, categoryId: 'self-study' },
    meals: { targetMinutesPerDay: 90, categoryId: 'meals' },
    entertainment: { maxMinutesPerDay: 90, categoryId: 'entertainment' },
  };
}
