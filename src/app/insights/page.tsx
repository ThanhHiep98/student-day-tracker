'use client';

import { ActivityAnalyticsPanel } from '@/components/activity-analytics-panel';
import { ComparePanel } from '@/components/compare-panel';
import { InsightCards } from '@/components/insight-cards';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { MonthlyOverviewCard } from '@/components/monthly-overview-card';
import { WeeklyOverviewChart } from '@/components/weekly-overview-chart';
import {
  MOCK_ACTIVITY_ANALYTICS,
  MOCK_INSIGHT_CARDS,
  MOCK_LAST_WEEK_BY_CATEGORY,
  MOCK_MONTHLY_OVERVIEW,
  MOCK_WEEKLY_BY_CATEGORY,
  MOCK_WEEKLY_DAYS,
} from '@/lib/insights-mock-fixture';
import { useCategories } from '@/lib/use-categories';
import { useDemoData } from '@/lib/use-demo-data';
import { useState } from 'react';

/**
 * Insights — req. 3: turn raw totals into narrative ("Bạn đang dành thời
 * gian cho điều gì?", not just "Work = 20h"). Categories come from real
 * Dexie data; the aggregated numbers themselves are still a static fixture
 * (src/lib/insights-mock-fixture.ts) — Backend phase (plan §2.2/§2.3)
 * replaces the fixture with real aggregation over live Dexie data. See
 * CLAUDE.md.
 */
export default function InsightsPage() {
  useDemoData(); // seeds the same demo activities Home/History use — see that hook
  const categories = useCategories();
  const [selectedActivity, setSelectedActivity] = useState(MOCK_ACTIVITY_ANALYTICS[0].name);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-8 sm:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Not just totals — what you&apos;re actually spending your time on.
        </p>
      </header>

      {categories === undefined ? (
        <LoadingSkeleton />
      ) : (
        <>
          <WeeklyOverviewChart
            days={MOCK_WEEKLY_DAYS}
            byCategory={MOCK_WEEKLY_BY_CATEGORY}
            categories={categories}
          />
          <ComparePanel
            current={MOCK_WEEKLY_BY_CATEGORY}
            previous={MOCK_LAST_WEEK_BY_CATEGORY}
            categories={categories}
          />
          <InsightCards cards={MOCK_INSIGHT_CARDS} />
          <MonthlyOverviewCard {...MOCK_MONTHLY_OVERVIEW} categories={categories} />
          <ActivityAnalyticsPanel
            activities={MOCK_ACTIVITY_ANALYTICS}
            selectedName={selectedActivity}
            onSelect={setSelectedActivity}
          />
        </>
      )}
    </main>
  );
}
