import { isSpanTail } from './activity-span';
import { formatMinutes } from './get-daily-summary';
import { getTimeBucket } from './get-time-bucket';
import { WEEKDAY_LONG_LABELS, filterByDateRange } from './get-weekly-summary';
import { daysBetween } from './iso-date';
import type { Activity, Category, IsoDate } from './types';

export interface InsightCard {
  id: 'week' | 'routine' | 'pattern' | 'consistency';
  title: string;
  body: string;
}

const MIN_ROUTINE_SESSIONS = 3;
const MIN_PATTERN_DAYS = 2;
const MIN_CONSISTENCY_DAYS = 3;

const duration = (a: Activity) => Math.max(0, a.endMinutes - a.startMinutes);

/** Pick the max by `score`; on equal scores the earlier entry (by `rank`) wins. */
function pickBest<T>(items: T[], score: (t: T) => number, rank: (t: T) => number): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (
      best === undefined ||
      score(item) > score(best) ||
      (score(item) === score(best) && rank(item) < rank(best))
    ) {
      best = item;
    }
  }
  return best;
}

/**
 * Req. 3.3 Insight cards, following plan §2.2 D1: up to four neutral
 * observations about the current week so far (`weekStart`…`today`). A card is
 * omitted when its threshold isn't met. Ties go to category `createdAt`
 * order, then the earlier day / time bucket. Pure — `today` is passed in.
 */
export function buildInsightCards(
  activities: Activity[],
  categories: Category[],
  { weekStart, today }: { weekStart: IsoDate; today: IsoDate }
): InsightCard[] {
  const categoryRank = new Map(
    [...categories].sort((a, b) => a.createdAt - b.createdAt).map((c, i) => [c.id, i])
  );
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const week = filterByDateRange(activities, weekStart, today).filter(
    (a) => categoryRank.has(a.categoryId) && duration(a) > 0
  );
  if (week.length === 0) return [];

  const elapsedDays = daysBetween(weekStart, today) + 1;
  const rankOf = (categoryId: string) => categoryRank.get(categoryId) ?? Number.MAX_SAFE_INTEGER;
  const cards: InsightCard[] = [];

  // Your week — top category by minutes.
  const minutesByCategory = new Map<string, number>();
  for (const a of week) {
    minutesByCategory.set(a.categoryId, (minutesByCategory.get(a.categoryId) ?? 0) + duration(a));
  }
  const top = pickBest(
    [...minutesByCategory.entries()],
    ([, minutes]) => minutes,
    ([id]) => rankOf(id)
  );
  if (top && top[1] > 0) {
    cards.push({
      id: 'week',
      title: 'Your week',
      body: `Most of your tracked time went to ${categoryName.get(top[0])} — ${formatMinutes(top[1])} this week.`,
    });
  }

  // Your routine — most frequent (category, 3-hour start bucket). Span tails
  // are skipped: they always start at 00:00 and belong to the head's session.
  const routineCounts = new Map<
    string,
    { categoryId: string; bucketStart: number; count: number }
  >();
  for (const a of week) {
    if (isSpanTail(a)) continue;
    const bucketStart = getTimeBucket(a.startMinutes).start;
    const key = `${a.categoryId}|${bucketStart}`;
    const entry = routineCounts.get(key) ?? { categoryId: a.categoryId, bucketStart, count: 0 };
    entry.count++;
    routineCounts.set(key, entry);
  }
  const routine = pickBest(
    [...routineCounts.values()],
    (r) => r.count,
    (r) => rankOf(r.categoryId) * 1440 + r.bucketStart
  );
  if (routine && routine.count >= MIN_ROUTINE_SESSIONS) {
    cards.push({
      id: 'routine',
      title: 'Your routine',
      body: `You usually do ${categoryName.get(routine.categoryId)} around ${getTimeBucket(routine.bucketStart).label} — ${routine.count} sessions this week.`,
    });
  }

  // Your pattern — longest tracked day.
  const minutesByDate = new Map<IsoDate, number>();
  for (const a of week) minutesByDate.set(a.date, (minutesByDate.get(a.date) ?? 0) + duration(a));
  if (minutesByDate.size >= MIN_PATTERN_DAYS) {
    const longest = pickBest(
      [...minutesByDate.entries()],
      ([, minutes]) => minutes,
      ([date]) => daysBetween(weekStart, date)
    );
    if (longest) {
      const weekday = WEEKDAY_LONG_LABELS[daysBetween(weekStart, longest[0])];
      cards.push({
        id: 'pattern',
        title: 'Your pattern',
        body: `${weekday} was your longest tracked day this week — ${formatMinutes(longest[1])}.`,
      });
    }
  }

  // Consistency — category tracked on the most distinct days.
  const daysByCategory = new Map<string, Set<IsoDate>>();
  for (const a of week) {
    const days = daysByCategory.get(a.categoryId) ?? new Set<IsoDate>();
    days.add(a.date);
    daysByCategory.set(a.categoryId, days);
  }
  const consistent = pickBest(
    [...daysByCategory.entries()],
    ([, days]) => days.size,
    ([id]) => rankOf(id)
  );
  if (consistent && consistent[1].size >= MIN_CONSISTENCY_DAYS) {
    const [categoryId, days] = consistent;
    const average = Math.round((minutesByCategory.get(categoryId) ?? 0) / days.size);
    cards.push({
      id: 'consistency',
      title: 'Consistency',
      body: `You tracked ${categoryName.get(categoryId)} on ${days.size} of ${elapsedDays} days this week — ${formatMinutes(average)} on those days.`,
    });
  }

  return cards;
}
