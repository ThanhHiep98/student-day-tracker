'use client';

import { ActivityAnalyticsPanel } from '@/components/activity-analytics-panel';
import { AiConsentSheet } from '@/components/ai-consent-sheet';
import { ComparePanel } from '@/components/compare-panel';
import { EfficiencySection } from '@/components/efficiency-section';
import { InsightCards } from '@/components/insight-cards';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { MonthlyOverviewCard } from '@/components/monthly-overview-card';
import { RatingTrend } from '@/components/rating-trend';
import { WeekComments } from '@/components/week-comments';
import { WeeklyOverviewChart } from '@/components/weekly-overview-chart';
import { buildAiInput } from '@/lib/build-ai-input';
import { buildInsightCards } from '@/lib/build-insight-cards';
import { buildRuleComments } from '@/lib/build-rule-comments';
import { getWeekToDateComparison } from '@/lib/compare-periods';
import { evaluateWeek } from '@/lib/evaluate-week';
import { getActivityAnalytics } from '@/lib/get-activity-analytics';
import { getWeekEfficiency } from '@/lib/get-efficiency';
import { getMonthlySummary } from '@/lib/get-monthly-summary';
import { getRatingTrend } from '@/lib/get-rating-trend';
import { filterByDateRange, getWeeklySummary } from '@/lib/get-weekly-summary';
import { addDays, fromIsoDate, startOfMonth, startOfWeek, toIsoDate } from '@/lib/iso-date';
import { useActivitiesRange } from '@/lib/use-activities-range';
import { useAiConsent } from '@/lib/use-ai-consent';
import { useAuth } from '@/lib/use-auth';
import { useCategories } from '@/lib/use-categories';
import { useDayRatingsRange } from '@/lib/use-day-ratings-range';
import { useHabitGoals } from '@/lib/use-habit-goals';
import { useWeeklyAiComment } from '@/lib/use-weekly-ai-comment';
import { setAiConsent } from '@/lib/user-profile';
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
  const { scope } = useAuth();
  const aiConsent = useAiConsent();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [consentSheetOpen, setConsentSheetOpen] = useState(false);

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
    const week =
      habitGoals && habitGoals.status === 'completed'
        ? evaluateWeek(activities, habitGoals, weekStart, fromIsoDate(today))
        : null;
    // ADR-009 §1.2 ⑤ "% hiệu quả · this week" — same `evaluateWeek` rollup the
    // rule-based comments and F3's AI input (below) are also derived from.
    const efficiency = week ? getWeekEfficiency(week) : null;
    return {
      weekly: getWeeklySummary(activities, categories, weekStart),
      compare: getWeekToDateComparison(activities, categories, { weekStart, today }),
      cards: buildInsightCards(activities, categories, { weekStart, today }),
      monthly: getMonthlySummary(monthActivities, categories, monthStart),
      analytics: getActivityAnalytics(monthActivities),
      ratingTrend: getRatingTrend(weekRatings, weekDays),
      weekComments: week ? buildRuleComments(week) : null,
      efficiency,
      // F3 (ADR-009 §2.2 D10) — numbers only, never raw activities/notes.
      aiInput: week && efficiency ? buildAiInput(week, efficiency, weekRatings) : null,
    };
  }, [activities, categories, weekStart, monthStart, today, weekRatings, habitGoals]);

  const aiState = useWeeklyAiComment({
    scope,
    consent: aiConsent,
    today,
    input: derived?.aiInput ?? null,
  });

  function handleTurnOnAi() {
    setConsentSheetOpen(true);
  }
  function handleTurnOffAi() {
    if (scope) setAiConsent(scope, false);
  }
  function handleConsentTurnOn() {
    if (scope) setAiConsent(scope, true);
    setConsentSheetOpen(false);
  }
  function handleConsentNotNow() {
    if (scope) setAiConsent(scope, false);
    setConsentSheetOpen(false);
  }

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
          {derived.efficiency && habitGoals && habitGoals.status === 'completed' && (
            <EfficiencySection
              efficiency={derived.efficiency}
              categories={categories}
              habitGoals={habitGoals}
            />
          )}
          {derived.weekComments !== null && (
            <WeekComments
              comments={derived.weekComments}
              ai={aiState}
              onTurnOnAi={handleTurnOnAi}
              onTurnOffAi={handleTurnOffAi}
            />
          )}
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

      <AiConsentSheet
        open={consentSheetOpen}
        onTurnOn={handleConsentTurnOn}
        onNotNow={handleConsentNotNow}
      />
    </main>
  );
}
