'use client';

import { ActivityTimeline } from '@/components/activity-timeline';
import { DailySummaryCard } from '@/components/daily-summary-card';
import { InstallBanner } from '@/components/install-banner';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { ThemeToggle } from '@/components/theme-toggle';
import { getDailySummary } from '@/lib/get-daily-summary';
import { toIsoDate } from '@/lib/iso-date';
import { useActivities } from '@/lib/use-activities';
import { useCategories } from '@/lib/use-categories';
import { useInstallPrompt } from '@/lib/use-install-prompt';

const GREETING_BY_HOUR = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Home — req. 1: "Hôm nay mình đã dành thời gian cho những gì?"
 * Header + Daily summary (1.1) + Today's Timeline (1.2). "+ Add Activity"
 * (1.3) is a disabled placeholder here: this repo is the environment
 * scaffold, not the feature build — see CLAUDE.md for the Plan → Implement
 * → Test workflow that builds it out.
 */
export default function Home() {
  const today = toIsoDate(new Date());
  const activities = useActivities(today);
  const categories = useCategories();
  const { canInstall, install, dismiss } = useInstallPrompt();

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const summary = activities && categories ? getDailySummary(activities, categories) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {GREETING_BY_HOUR(now.getHours())}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            aria-disabled
            title="Coming soon"
            className="rounded-full bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            + Add Activity
          </button>
          <ThemeToggle />
        </div>
      </header>

      {canInstall && <InstallBanner onInstall={install} onDismiss={dismiss} />}

      {activities === undefined || categories === undefined ? (
        <LoadingSkeleton />
      ) : (
        <>
          <DailySummaryCard
            totalMinutes={summary?.totalMinutes ?? 0}
            byCategory={summary?.byCategory ?? []}
            categories={categories}
          />
          <ActivityTimeline activities={activities} categories={categories} />
        </>
      )}
    </main>
  );
}
