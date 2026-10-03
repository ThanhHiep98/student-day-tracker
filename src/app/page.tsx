'use client';

import { MobileAccountButton } from '@/components/account-menu';
import { ActivityTimeline } from '@/components/activity-timeline';
import { AddActivityForm, type AddActivityFormValues } from '@/components/add-activity-form';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DailyDonutChart } from '@/components/daily-donut-chart';
import { DailySummaryCard } from '@/components/daily-summary-card';
import { DayRatingCard } from '@/components/day-rating-card';
import { InstallBanner } from '@/components/install-banner';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { OnboardingBanner } from '@/components/onboarding-banner';
import { PlanStatusCard } from '@/components/plan-status-card';
import { RecentActivityRail } from '@/components/recent-activity-rail';
import { ThemeToggle } from '@/components/theme-toggle';
import { TipCard } from '@/components/tip-card';
import { WelcomeBackDialog } from '@/components/welcome-back-dialog';
import { mergeActivitySpan } from '@/lib/activity-span';
import {
  addActivityRows,
  deleteActivity,
  getActivityRows,
  updateActivity,
} from '@/lib/activity-writes';
import { buildActivity } from '@/lib/build-activity';
import { buildCategory } from '@/lib/build-category';
import { buildRuleComments } from '@/lib/build-rule-comments';
import { addCategory } from '@/lib/category-writes';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';
import { evaluateDay } from '@/lib/evaluate-day';
import { evaluateWeek } from '@/lib/evaluate-week';
import { getDailySummary } from '@/lib/get-daily-summary';
import { getDayEfficiency } from '@/lib/get-efficiency';
import { getGivenName } from '@/lib/get-given-name';
import { addDays, startOfWeek, toIsoDate } from '@/lib/iso-date';
import type { Activity, Category } from '@/lib/types';
import { useActivities } from '@/lib/use-activities';
import { useActivitiesRange } from '@/lib/use-activities-range';
import { useAiComment } from '@/lib/use-ai-comment';
import { useAiConsent } from '@/lib/use-ai-consent';
import { useAuth } from '@/lib/use-auth';
import { useCategories } from '@/lib/use-categories';
import { useDayRating } from '@/lib/use-day-rating';
import { useHabitGoals } from '@/lib/use-habit-goals';
import { useInstallPrompt } from '@/lib/use-install-prompt';
import { markWelcomeBackShown, useWelcomeBackEligibility } from '@/lib/use-welcome-back-dialog';
import { useEffect, useState } from 'react';

const GREETING_BY_HOUR = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const BUILT_IN_CATEGORIES: Category[] = [...DEFAULT_CATEGORIES];

type FormState =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; activity: Activity; initialValues: AddActivityFormValues };

/**
 * Home — req. 1. Add/Edit/Delete Activity and "+ New category" build rows
 * with the pure builders (build-activity.ts / build-category.ts, which own
 * validation and throw user-facing messages) and queue them as Firestore
 * writes for the signed-in user; the live queries re-render the Timeline and
 * Daily summary at once, online or offline. A builder error propagates to
 * AddActivityForm, which shows it inline.
 *
 * A cross-midnight activity is two rows (activity-writes.ts): Edit opens the
 * whole span from either row, and save/delete act on both in one batch.
 */
export default function Home() {
  const today = toIsoDate(new Date());
  const yesterday = addDays(today, -1);
  const dayBeforeYesterday = addDays(today, -2);
  const activities = useActivities(today);
  // Covers the day before too: a cross-midnight sleep span ending today has
  // its bedtime row on yesterday (evaluate-day.ts).
  const planActivities = useActivitiesRange(addDays(today, -1), today);
  // ADR-009 §1.2 ④ welcome-back dialog: one range covers yesterday, the day
  // before it (for the comparison line, including its own sleep-span day
  // before that) and the whole week around yesterday (for the week's
  // rule-based comment, slice 4's buildRuleComments).
  const wbWeekStart = startOfWeek(yesterday);
  const wbActivities = useActivitiesRange(addDays(wbWeekStart, -1), addDays(wbWeekStart, 6));
  const yesterdayRating = useDayRating(yesterday);
  const categories = useCategories();
  const habitGoals = useHabitGoals();
  const todayRating = useDayRating(today);
  const { canInstall, install, dismiss } = useInstallPrompt();
  const { user, scope } = useAuth();
  const givenName = user ? getGivenName(user.displayName, user.email) : null;
  // The built-in categories live in code, so logging works before the stored
  // custom ones arrive (a fresh account's first snapshot needs the server).
  const formCategories = categories ?? BUILT_IN_CATEGORIES;

  const [formState, setFormState] = useState<FormState>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<Activity | null>(null);
  // The date (if any) the student already closed today's dialog for — keyed
  // by date rather than a plain boolean so a new calendar day (D8) is
  // eligible again without a separate reset effect.
  const [welcomeBackDismissedFor, setWelcomeBackDismissedFor] = useState<string | null>(null);
  const welcomeBackEligible = useWelcomeBackEligibility(scope?.uid ?? null, today);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const summary = activities && categories ? getDailySummary(activities, categories) : undefined;
  const dayEvaluation =
    planActivities && habitGoals && habitGoals.status === 'completed'
      ? evaluateDay(planActivities, habitGoals, today, now)
      : undefined;

  // ADR-009 §1.2 ④: yesterday's % hiệu quả, the day before's (for the
  // comparison line) and the week's rule-based comment, all from one range
  // query (`wbActivities`).
  const goalsReady = habitGoals && habitGoals.status === 'completed' ? habitGoals : undefined;
  const yesterdayEvaluation =
    wbActivities && goalsReady ? evaluateDay(wbActivities, goalsReady, yesterday, now) : undefined;
  const dayBeforeEvaluation =
    wbActivities && goalsReady
      ? evaluateDay(wbActivities, goalsReady, dayBeforeYesterday, now)
      : undefined;
  const yesterdayEfficiency = yesterdayEvaluation
    ? getDayEfficiency(yesterdayEvaluation)
    : undefined;
  const dayBeforeEfficiency = dayBeforeEvaluation
    ? getDayEfficiency(dayBeforeEvaluation)
    : undefined;
  const welcomeBackComment =
    wbActivities && goalsReady
      ? (buildRuleComments(evaluateWeek(wbActivities, goalsReady, wbWeekStart, now))[0] ?? null)
      : null;
  // F3 (ADR-009 §2.2 D11) — reuse whatever Gemini comment is already cached
  // for today (generated by Insights' `useWeeklyAiComment`, which owns the
  // actual call); Home never calls Gemini itself.
  const aiConsent = useAiConsent();
  const todayAiComment = useAiComment(today);
  const welcomeBackCommentSource: 'gemini' | 'rule-based' =
    aiConsent === true && todayAiComment ? 'gemini' : 'rule-based';
  const welcomeBackDisplayComment =
    welcomeBackCommentSource === 'gemini' && todayAiComment
      ? todayAiComment.text
      : welcomeBackComment;
  const hasYesterdayData = (yesterdayEvaluation?.totalTrackedMinutes ?? 0) > 0;
  const welcomeBackOpen =
    welcomeBackEligible &&
    hasYesterdayData &&
    welcomeBackDismissedFor !== today &&
    yesterdayEfficiency !== undefined;

  // D8: mark the flag the moment the dialog becomes eligible to show, not
  // only when the student closes it — a reload later today must not reopen it.
  useEffect(() => {
    if (welcomeBackOpen && scope) markWelcomeBackShown(scope.uid, today);
  }, [welcomeBackOpen, scope, today]);

  // The auth gate only renders pages once signed in, so `scope` is set here.
  function requireScope() {
    if (!scope) throw new Error('You are signed out. Sign in again to save changes.');
    return scope;
  }

  async function handleCreateCategory(name: string): Promise<Category> {
    // Dedupe needs the stored custom categories, not just the built-in ones.
    if (!categories) throw new Error('Still loading your categories — try again in a moment.');
    const category = buildCategory(name, categories, {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    });
    addCategory(requireScope(), category);
    return category;
  }

  // Writes are queued, not awaited (offline they'd wait for the server), so
  // the form closes immediately; only builder validation errors are thrown.
  async function handleSubmit(values: AddActivityFormValues) {
    if (formState.open && formState.mode === 'edit') {
      await updateActivity(requireScope(), formState.activity, values, formCategories);
    } else {
      addActivityRows(
        requireScope(),
        buildActivity(values, formCategories, {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        })
      );
    }
    setFormState({ open: false });
  }

  async function handleEdit(activity: Activity) {
    const rows = await getActivityRows(requireScope(), activity);
    if (rows.length === 0) return; // Already deleted; the live query will drop the row.
    setFormState({ open: true, mode: 'edit', activity, initialValues: mergeActivitySpan(rows) });
  }

  function handleDeleteConfirmed() {
    if (confirmDelete && scope) {
      deleteActivity(scope, confirmDelete);
      setConfirmDelete(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {GREETING_BY_HOUR(now.getHours())}
            {givenName ? `, ${givenName}` : ''}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormState({ open: true, mode: 'add' })}
            className="rounded-full bg-zinc-900 px-3.5 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100"
          >
            + Add Activity
          </button>
          <ThemeToggle className="hidden sm:flex" />
          <MobileAccountButton className="sm:hidden" />
        </div>
      </header>

      {canInstall && <InstallBanner onInstall={install} onDismiss={dismiss} />}
      {habitGoals && habitGoals.status !== 'completed' && (
        <OnboardingBanner lastStep={habitGoals.lastStep} />
      )}

      {activities === undefined || categories === undefined ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            {dayEvaluation && <PlanStatusCard evaluation={dayEvaluation} />}
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
              onEdit={handleEdit}
              onDelete={(activity) => setConfirmDelete(activity)}
            />
          </div>
          <aside className="flex flex-col gap-4">
            {todayRating !== undefined && (
              <DayRatingCard date={today} today={today} rating={todayRating} scope={scope} />
            )}
            <TipCard />
            <RecentActivityRail activities={activities} categories={categories} />
          </aside>
        </div>
      )}

      <AddActivityForm
        open={formState.open}
        mode={formState.open ? formState.mode : 'add'}
        categories={formCategories}
        defaultDate={today}
        initialValues={
          formState.open && formState.mode === 'edit' ? formState.initialValues : undefined
        }
        onSubmit={handleSubmit}
        onCancel={() => setFormState({ open: false })}
        onCreateCategory={handleCreateCategory}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this activity?"
        description={
          confirmDelete
            ? confirmDelete.spanId !== undefined
              ? `"${confirmDelete.name}" crosses midnight — this removes both days.`
              : `"${confirmDelete.name}" will be removed from today's timeline.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />

      {yesterdayEfficiency && goalsReady && (
        <WelcomeBackDialog
          open={welcomeBackOpen}
          onClose={() => setWelcomeBackDismissedFor(today)}
          date={yesterday}
          today={today}
          efficiency={yesterdayEfficiency}
          dayBeforePercent={dayBeforeEfficiency?.percent ?? null}
          comment={welcomeBackDisplayComment}
          commentSource={welcomeBackCommentSource}
          categories={formCategories}
          habitGoals={goalsReady}
          rating={yesterdayRating}
          scope={scope}
        />
      )}
    </main>
  );
}
