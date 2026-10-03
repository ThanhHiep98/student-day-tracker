'use client';

import { ActivityTimeline } from '@/components/activity-timeline';
import { DailySummaryCard } from '@/components/daily-summary-card';
import { DayRatingCard } from '@/components/day-rating-card';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { buildMonthGrid } from '@/lib/build-month-grid';
import { getDailySummary } from '@/lib/get-daily-summary';
import { toIsoDate } from '@/lib/iso-date';
import { useActivities } from '@/lib/use-activities';
import { useAuth } from '@/lib/use-auth';
import { useCategories } from '@/lib/use-categories';
import { useDayRating } from '@/lib/use-day-rating';
import { useMemo, useState } from 'react';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * History — req. 2: calendar view of the month; clicking a day shows that
 * day's summary below (reusing the same Daily summary + Timeline used on
 * Home). Month navigation and richer day previews are left for the
 * Implement agent — see CLAUDE.md. Reads the signed-in user's Firestore data
 * through the same live hooks as Home.
 */
export default function HistoryPage() {
  const now = new Date();
  const today = toIsoDate(now);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState(today);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const monthLabel = useMemo(
    () =>
      new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [cursor]
  );

  const activities = useActivities(selectedDate);
  const categories = useCategories();
  const summary = activities && categories ? getDailySummary(activities, categories) : undefined;
  const { scope } = useAuth();
  const rating = useDayRating(selectedDate);

  function changeMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      </header>

      <section
        aria-labelledby="calendar-heading"
        className="rounded-2xl border border-border bg-surface p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="rounded-full px-2 py-1 text-sm text-zinc-500 hover:bg-surface-muted"
          >
            ‹
          </button>
          <h2 id="calendar-heading" className="text-sm font-semibold">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="rounded-full px-2 py-1 text-sm text-zinc-500 hover:bg-surface-muted"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.weeks.flat().map((date, i) => {
            // biome-ignore lint/suspicious/noArrayIndexKey: blank calendar cells have no natural id; position is stable within a single month grid render
            if (!date) return <span key={`blank-${i}`} aria-hidden />;
            const isSelected = date === selectedDate;
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                aria-current={isSelected ? 'date' : undefined}
                className={`aspect-square rounded-lg text-sm transition-colors motion-reduce:transition-none ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : isToday
                      ? 'font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-300 dark:text-zinc-50 dark:ring-zinc-700'
                      : 'text-zinc-700 hover:bg-surface-muted dark:text-zinc-300'
                }`}
              >
                {Number(date.slice(-2))}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="day-summary-heading" className="space-y-4">
        <h2
          id="day-summary-heading"
          className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h2>
        {activities === undefined || categories === undefined || rating === undefined ? (
          <LoadingSkeleton />
        ) : (
          <>
            <DayRatingCard date={selectedDate} today={today} rating={rating} scope={scope} />
            <DailySummaryCard
              totalMinutes={summary?.totalMinutes ?? 0}
              byCategory={summary?.byCategory ?? []}
              categories={categories}
            />
            <ActivityTimeline activities={activities} categories={categories} />
          </>
        )}
      </section>
    </main>
  );
}
