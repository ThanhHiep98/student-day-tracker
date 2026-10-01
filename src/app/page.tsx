'use client';

import { ActivityTimeline } from '@/components/activity-timeline';
import { AddActivityForm, type AddActivityFormValues } from '@/components/add-activity-form';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DailyDonutChart } from '@/components/daily-donut-chart';
import { DailySummaryCard } from '@/components/daily-summary-card';
import { DemoBanner } from '@/components/demo-banner';
import { InstallBanner } from '@/components/install-banner';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { RecentActivityRail } from '@/components/recent-activity-rail';
import { ThemeToggle } from '@/components/theme-toggle';
import { TipCard } from '@/components/tip-card';
import { buildActivity, buildUpdatedActivity } from '@/lib/build-activity';
import { buildCategory } from '@/lib/build-category';
import { db } from '@/lib/db';
import { getDailySummary } from '@/lib/get-daily-summary';
import { toIsoDate } from '@/lib/iso-date';
import type { Activity, Category } from '@/lib/types';
import { useActivities } from '@/lib/use-activities';
import { useCategories } from '@/lib/use-categories';
import { useDemoData } from '@/lib/use-demo-data';
import { useInstallPrompt } from '@/lib/use-install-prompt';
import { useState } from 'react';

const GREETING_BY_HOUR = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

type FormState =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; activity: Activity };

/**
 * Home — req. 1. Add/Edit/Delete Activity and "+ New category" build rows
 * with the pure builders (build-activity.ts / build-category.ts, which own
 * validation and throw user-facing messages) and write them to Dexie; the
 * live queries re-render the Timeline and Daily summary. A builder or Dexie
 * error propagates to AddActivityForm, which shows it inline.
 */
export default function Home() {
  const today = toIsoDate(new Date());
  const activities = useActivities(today);
  const categories = useCategories();
  const { canInstall, install, dismiss } = useInstallPrompt();
  const { isDemo, clearDemo } = useDemoData();

  const [formState, setFormState] = useState<FormState>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<Activity | null>(null);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const summary = activities && categories ? getDailySummary(activities, categories) : undefined;

  async function handleCreateCategory(name: string): Promise<Category> {
    const category = buildCategory(name, categories ?? [], {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    });
    await db.categories.add(category);
    return category;
  }

  async function handleSubmit(values: AddActivityFormValues) {
    if (formState.open && formState.mode === 'edit') {
      await db.activities.put(buildUpdatedActivity(formState.activity, values, categories ?? []));
    } else {
      await db.activities.add(
        buildActivity(values, categories ?? [], {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          date: today,
        })
      );
    }
    setFormState({ open: false });
  }

  async function handleDeleteConfirmed() {
    if (confirmDelete) {
      await db.activities.delete(confirmDelete.id);
      setConfirmDelete(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {GREETING_BY_HOUR(now.getHours())}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormState({ open: true, mode: 'add' })}
            className="rounded-full bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100"
          >
            + Add Activity
          </button>
          <ThemeToggle />
        </div>
      </header>

      {canInstall && <InstallBanner onInstall={install} onDismiss={dismiss} />}
      {isDemo && <DemoBanner onClear={clearDemo} />}

      {activities === undefined || categories === undefined ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
              <DailySummaryCard
                totalMinutes={summary?.totalMinutes ?? 0}
                byCategory={summary?.byCategory ?? []}
                categories={categories}
              />
              <DailyDonutChart
                totalMinutes={summary?.totalMinutes ?? 0}
                byCategory={summary?.byCategory ?? []}
                categories={categories}
              />
            </div>
            <ActivityTimeline
              activities={activities}
              categories={categories}
              onEdit={(activity) => setFormState({ open: true, mode: 'edit', activity })}
              onDelete={(activity) => setConfirmDelete(activity)}
            />
          </div>
          <aside className="flex flex-col gap-4">
            <TipCard />
            <RecentActivityRail activities={activities} categories={categories} />
          </aside>
        </div>
      )}

      <AddActivityForm
        open={formState.open}
        mode={formState.open ? formState.mode : 'add'}
        categories={categories ?? []}
        initialValues={formState.open && formState.mode === 'edit' ? formState.activity : undefined}
        onSubmit={handleSubmit}
        onCancel={() => setFormState({ open: false })}
        onCreateCategory={handleCreateCategory}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this activity?"
        description={
          confirmDelete
            ? `"${confirmDelete.name}" will be removed from today's timeline.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </main>
  );
}
