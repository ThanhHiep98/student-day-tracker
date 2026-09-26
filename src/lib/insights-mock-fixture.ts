/**
 * TEMPORARY — Frontend-phase mock fixture for Insights (req. 3). Numbers
 * match the mockups reconstructed in plans/2026-09-26-add-activity.html §1.2.
 *
 * Replaced by real Dexie-backed aggregation in Backend phase (plan §2.2/§2.3:
 * getWeeklySummary, getMonthlySummary, comparePeriods, buildInsightCards,
 * getActivityAnalytics). See CLAUDE.md for the Frontend/Backend phase split.
 */

export const MOCK_WEEKLY_DAYS: { label: string; minutes: number }[] = [
  { label: 'Mon', minutes: 348 },
  { label: 'Tue', minutes: 408 },
  { label: 'Wed', minutes: 300 },
  { label: 'Thu', minutes: 360 },
  { label: 'Fri', minutes: 468 },
  { label: 'Sat', minutes: 240 },
  { label: 'Sun', minutes: 192 },
];

export const MOCK_WEEKLY_BY_CATEGORY: { categoryId: string; minutes: number }[] = [
  { categoryId: 'work', minutes: 1275 }, // 21h 15m
  { categoryId: 'study', minutes: 500 }, // 8h 20m
  { categoryId: 'exercise', minutes: 250 }, // 4h 10m
  { categoryId: 'entertainment', minutes: 330 }, // 5h 30m
];

export const MOCK_LAST_WEEK_BY_CATEGORY: { categoryId: string; minutes: number }[] = [
  { categoryId: 'work', minutes: 1120 }, // 18h 40m
  { categoryId: 'study', minutes: 370 }, // 6h 10m
  { categoryId: 'exercise', minutes: 210 }, // 3h 30m
];

export const MOCK_INSIGHT_CARDS: { id: string; title: string; body: string }[] = [
  {
    id: 'routine',
    title: 'Your routine',
    body: 'You usually Study around 19:00–21:00 — 5 sessions this week.',
  },
  {
    id: 'week',
    title: 'Your week',
    body: 'Most of your tracked time went to Work — 21h 15m this week.',
  },
  {
    id: 'pattern',
    title: 'Your pattern',
    body: 'Friday was your longest tracked day this week — 7h 48m.',
  },
  {
    id: 'consistency',
    title: 'Consistency',
    body: 'You exercised on 4 of the last 7 days — 43m/day average.',
  },
];

export const MOCK_MONTHLY_OVERVIEW = {
  month: 'September',
  totalMinutes: 9760, // 162h 40m
  topCategory: { categoryId: 'work', minutes: 4680 }, // 78h
  mostActiveDay: 'Tuesday',
  mostCommonActivity: 'Design',
  averagePerDayMinutes: 325, // 5h 25m
};

export const MOCK_ACTIVITY_ANALYTICS: {
  name: string;
  totalMinutes: number;
  sessions: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  mostCommonTime: string;
}[] = [
  {
    name: 'Design',
    totalMinutes: 1960, // 32h 40m
    sessions: 18,
    averageSessionMinutes: 109, // 1h 49m
    longestSessionMinutes: 250, // 4h 10m
    mostCommonTime: '09:00–12:00',
  },
  {
    name: 'Study UX',
    totalMinutes: 690, // 11h 30m
    sessions: 8,
    averageSessionMinutes: 86,
    longestSessionMinutes: 150,
    mostCommonTime: '12:30–14:00',
  },
  {
    name: 'Gym',
    totalMinutes: 315, // 5h 15m
    sessions: 7,
    averageSessionMinutes: 45,
    longestSessionMinutes: 60,
    mostCommonTime: '15:00–16:00',
  },
];
