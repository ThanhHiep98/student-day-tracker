import type { Activity } from './types';

/**
 * Sample "today" activities for the demo banner on Home — same data used to
 * verify the desktop layout against the requirement mockup ("1.1 + 1.2 bản
 * đầy đủ"). Session-local only, like everything else in the Frontend phase
 * (plans/2026-09-26-add-activity.html §1.1) — never written to Dexie.
 */
const DEMO_ENTRIES: [name: string, categoryId: string, startMinutes: number, endMinutes: number][] =
  [
    ['Design landing page', 'work', 9 * 60 + 30, 11 * 60 + 45],
    ['Study UX', 'study', 12 * 60 + 30, 14 * 60],
    ['Gym', 'exercise', 15 * 60, 15 * 60 + 45],
    ['Gaming', 'entertainment', 20 * 60, 21 * 60 + 10],
  ];

export function buildDemoActivities(date: string): Activity[] {
  const now = Date.now();
  return DEMO_ENTRIES.map(([name, categoryId, startMinutes, endMinutes], i) => ({
    id: crypto.randomUUID(),
    name,
    categoryId,
    date,
    startMinutes,
    endMinutes,
    createdAt: now + i,
  }));
}
