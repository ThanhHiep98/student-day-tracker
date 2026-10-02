import { addDays } from '../../../src/lib/iso-date';
import type { Activity, IsoDate } from '../../../src/lib/types';

/**
 * E2E fixture: a realistic week of activities (today + the 6 days before) —
 * the content the retired in-app demo mode used to seed. Tests write it to
 * the Firestore emulator for a signed-in user (support/emulator.ts); it is not
 * part of the app.
 */
type Entry = [name: string, categoryId: string, startMinutes: number, endMinutes: number];

const t = (hh: number, mm = 0) => hh * 60 + mm;

const DAYS_AGO_TO_ENTRIES: Record<number, Entry[]> = {
  0: [
    ['Design landing page', 'work', t(9, 30), t(11, 45)],
    ['Study UX', 'study', t(12, 30), t(14)],
    ['Gym', 'exercise', t(15), t(15, 45)],
    ['Gaming', 'entertainment', t(20), t(21, 10)],
  ],
  1: [
    ['Team standup', 'work', t(9), t(9, 30)],
    ['Read textbook', 'study', t(10), t(11, 30)],
    ['Run', 'exercise', t(18), t(18, 40)],
    ['Movie night', 'entertainment', t(21), t(22, 30)],
  ],
  2: [
    ['Client meeting', 'work', t(10), t(11)],
    ['Math homework', 'study', t(14), t(15, 30)],
    ['Yoga', 'exercise', t(7), t(7, 30)],
  ],
  3: [
    ['Code review', 'work', t(9), t(10, 15)],
    ['Group project', 'study', t(13), t(15)],
    ['Basketball', 'exercise', t(17), t(18)],
    ['Podcast', 'entertainment', t(20, 30), t(21)],
  ],
  4: [
    ['Design landing page', 'work', t(9, 30), t(12)],
    ['Study UX', 'study', t(13), t(14, 30)],
  ],
  5: [
    ['Sprint planning', 'work', t(9), t(10)],
    ['Library research', 'study', t(11), t(13)],
    ['Swim', 'exercise', t(16), t(16, 45)],
    ['Gaming', 'entertainment', t(19, 30), t(21)],
  ],
  6: [
    ['Bug fixing', 'work', t(9), t(11, 30)],
    ['Flashcards review', 'study', t(20), t(20, 30)],
  ],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildSampleWeek(today: IsoDate, now: number, idPrefix = 'sample-'): Activity[] {
  const activities: Activity[] = [];
  let n = 0;
  for (const [daysAgoStr, entries] of Object.entries(DAYS_AGO_TO_ENTRIES)) {
    const daysAgo = Number(daysAgoStr);
    const date = addDays(today, -daysAgo);
    entries.forEach(([name, categoryId, startMinutes, endMinutes], i) => {
      activities.push({
        id: `${idPrefix}${n++}`,
        name,
        categoryId,
        date,
        startMinutes,
        endMinutes,
        createdAt: now - daysAgo * DAY_MS + i,
      });
    });
  }
  return activities;
}
