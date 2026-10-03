import { describe, expect, it } from 'vitest';
import { buildAiInput } from './build-ai-input';
import { buildAiPrompt } from './build-ai-prompt';
import { evaluateWeek } from './evaluate-week';
import { getWeekEfficiency } from './get-efficiency';
import { suggestedHabitGoals } from './suggested-habit-goals';
import type { Activity, DayRating, HabitGoals } from './types';

const WEEK_START = '2026-09-28';
const AFTER_WEEK = new Date('2026-10-05T09:00:00');
const WEEKDAYS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];

const GOALS: HabitGoals = {
  version: 1,
  status: 'completed',
  lastStep: 5,
  ...suggestedHabitGoals(),
  createdAt: 1,
  updatedAt: 1,
};

const SECRET_ACTIVITY_NAME = 'Minh Anh private tutoring with Mrs. Lan';
const SECRET_NOTE = 'Had a huge fight with my parents tonight, feeling awful about it.';
const SECRET_EMAIL = 'minh.anh.secret@example.com';
const SECRET_CATEGORY_NAME = "Minh Anh's Custom Hobby Time";

let nextId = 0;
function activity(
  partial: Partial<Activity> & Pick<Activity, 'categoryId' | 'date' | 'startMinutes' | 'endMinutes'>
): Activity {
  nextId++;
  return { id: `a${nextId}`, name: SECRET_ACTIVITY_NAME, createdAt: nextId, ...partial };
}

function weekdayActivities(date: string): Activity[] {
  return [
    activity({ categoryId: 'sleep', date, startMinutes: 60, endMinutes: 438 }),
    activity({ categoryId: 'school', date, startMinutes: 420, endMinutes: 690 }),
    activity({ categoryId: 'school', date, startMinutes: 810, endMinutes: 990 }),
    activity({ categoryId: 'self-study', date, startMinutes: 1000, endMinutes: 1112 }),
    activity({ categoryId: SECRET_CATEGORY_NAME, date, startMinutes: 1120, endMinutes: 1220 }),
    activity({ categoryId: 'entertainment', date, startMinutes: 1225, endMinutes: 1300 }),
  ];
}

const ratingsWithNotes: (DayRating & { date: string })[] = WEEKDAYS.map((date) => ({
  date,
  score: 4,
  note: SECRET_NOTE,
  updatedAt: 1,
}));

describe('buildAiPrompt — D10 "numbers only"', () => {
  it('never contains the activity name, a rating note, an email, or a custom category name', () => {
    const activities = WEEKDAYS.flatMap(weekdayActivities);
    const week = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
    const efficiency = getWeekEfficiency(week);
    const input = buildAiInput(
      week,
      efficiency,
      ratingsWithNotes.map(({ date, score }) => ({ date, score }))
    );
    const prompt = buildAiPrompt(input);

    expect(prompt).not.toContain(SECRET_ACTIVITY_NAME);
    expect(prompt).not.toContain(SECRET_NOTE);
    expect(prompt).not.toContain(SECRET_EMAIL);
    expect(prompt).not.toContain(SECRET_CATEGORY_NAME);
    expect(prompt).not.toContain('Minh Anh');
  });

  it('includes the week average, a per-goal line and the average rating', () => {
    const activities = WEEKDAYS.flatMap(weekdayActivities);
    const week = evaluateWeek(activities, GOALS, WEEK_START, AFTER_WEEK);
    const efficiency = getWeekEfficiency(week);
    const input = buildAiInput(week, efficiency, [{ date: '2026-09-28', score: 4 }]);
    const prompt = buildAiPrompt(input);

    expect(prompt).toContain(`Week average: ${efficiency.average}%`);
    expect(prompt).toContain('Sleep: avg');
    expect(prompt).toContain('Average day rating: 4/5');
    expect(prompt).toMatch(/at most 80 words/);
  });

  it('states "not tracked" / "no data" instead of crashing on an empty week', () => {
    const week = evaluateWeek([], GOALS, WEEK_START, AFTER_WEEK);
    const efficiency = getWeekEfficiency(week);
    const input = buildAiInput(week, efficiency, []);
    const prompt = buildAiPrompt(input);
    expect(prompt).toContain('Week average: not tracked');
    expect(prompt).toContain('Average day rating: not rated');
    expect(prompt).toContain('no data');
  });
});
