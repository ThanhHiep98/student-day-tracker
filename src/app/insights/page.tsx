'use client';

import { ActivityAnalyticsPanel } from '@/components/activity-analytics-panel';
import { ComparePanel } from '@/components/compare-panel';
import { InsightCards } from '@/components/insight-cards';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { MonthlyOverviewCard } from '@/components/monthly-overview-card';
import { RatingTrend } from '@/components/rating-trend';
import { WeekComments } from '@/components/week-comments';
import { WeeklyOverviewChart } from '@/components/weekly-overview-chart';
import { buildInsightCards } from '@/lib/build-insight-cards';
import { buildRuleComments } from '@/lib/build-rule-comments';
import { getWeekToDateComparison } from '@/lib/compare-periods';
import { evaluateWeek } from '@/lib/evaluate-week';
import { getActivityAnalytics } from '@/lib/get-activity-analytics';
import { getMonthlySummary } from '@/lib/get-monthly-summary';
import { getRatingTrend } from '@/lib/get-rating-trend';
import { filterByDateRange, getWeeklySummary } from '@/lib/get-weekly-summary';
import { addDays, fromIsoDate, startOfMonth, startOfWeek, toIsoDate } from '@/lib/iso-date';
import { useActivitiesRange } from '@/lib/use-activities-range';
import { useCategories } from '@/lib/use-categories';
import { useDayRatingsRange } from '@/lib/use-day-ratings-range';
import { useHabitGoals } from '@/lib/use-habit-goals';
import { useMemo, useState } from 'react';

/**
 * Insights — req. 3: turn raw totals into narrative ("Bạn đang dành thời
 * gian cho điều gì?", not just "Work = 20h"). One live Firestore range query
 * covers last week's comparison span and this month; each section is then
 * derived by a pure helper. Weeks are Mon–Sun, months are calendar months.
 */
export default function InsightsPage() {
  const categories = useCategories();
  const habitGoals = useHabitGoals();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // The clock is read here, once per render — every helper below takes dates as args.
  const today = toIsoDate(new Date());
  const weekStart = startOfWeek(today);
  const monthStart = startOfMonth(today);
  const prevWeekStart = addDays(weekStart, -7);
  const rangeStart = prevWeekStart < monthStart ? prevWeekStart : monthStart;
  const weekEnd = addDays(weekStart, 6);

  const activities = useActivitiesRange(rangeStart, today);
  const weekRatings = useDayRatingsRange(weekStart, weekEnd);

  const derived = useMemo(() => {
    if (!activities || !categories || !weekRatings) return undefined;
    const monthActivities = filterByDateRange(activities, monthStart, today);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekComments =
      habitGoals && habitGoals.status === 'completed'
        ? buildRuleComments(evaluateWeek(activities, habitGoals, weekStart, fromIsoDate(today)))
        : null;
    return {
      weekly: getWeeklySummary(activities, categories, weekStart),
      compare: getWeekToDateComparison(activities, categories, { weekStart, today }),
      cards: buildInsightCards(activities, categories, { weekStart, today }),
      monthly: getMonthlySummary(monthActivities, categories, monthStart),
      analytics: getActivityAnalytics(monthActivities),
      ratingTrend: getRatingTrend(weekRatings, weekDays),
      weekComments,
    };
  }, [activities, categories, weekStart, monthStart, today, weekRatings, habitGoals]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-8 sm:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Not just totals — what you&apos;re actually spending your time on.
        </p>
      </header>

      {derived === undefined || categories === undefined ? (
        <LoadingSkeleton />
      ) : (
        <>
          {derived.weekComments !== null && <WeekComments comments={derived.weekComments} />}
          <RatingTrend trend={derived.ratingTrend} />
          <WeeklyOverviewChart {...derived.weekly} categories={categories} />
          <ComparePanel result={derived.compare} categories={categories} />
          <InsightCards cards={derived.cards} />
          <MonthlyOverviewCard summary={derived.monthly} categories={categories} />
          <ActivityAnalyticsPanel
            activities={derived.analytics}
            selectedKey={selectedActivity}
            onSelect={setSelectedActivity}
          />
        </>
      )}
    </main>
  );
}
