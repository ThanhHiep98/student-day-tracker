import { EmptyState } from '@/components/empty-state';
import { formatMinutes } from '@/lib/get-daily-summary';
import type { MonthlySummary } from '@/lib/get-monthly-summary';
import type { Category } from '@/lib/types';

interface MonthlyOverviewCardProps {
  /** null when nothing was tracked this month (getMonthlySummary). */
  summary: MonthlySummary | null;
  categories: Category[];
}

/** Req. 3.3 "Monthly Overview" — rolled-up totals for the current month. */
export function MonthlyOverviewCard({ summary, categories }: MonthlyOverviewCardProps) {
  const topCategoryName = summary
    ? (categories.find((c) => c.id === summary.topCategory.categoryId)?.name ??
      summary.topCategory.categoryId)
    : '';

  const rows: [string, string][] = summary
    ? [
        ['Tracked time', formatMinutes(summary.totalMinutes)],
        ['Top category', `${topCategoryName} · ${formatMinutes(summary.topCategory.minutes)}`],
        ['Most active day', summary.mostActiveDay],
        ['Most common activity', summary.mostCommonActivity],
        ['Average / tracked day', formatMinutes(summary.averagePerDayMinutes)],
      ]
    : [];

  return (
    <section
      aria-labelledby="monthly-overview-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="monthly-overview-heading" className="text-sm font-semibold">
        Monthly overview
      </h2>
      {summary === null ? (
        <div className="mt-4">
          <EmptyState
            headingLevel="h3"
            title="Nothing tracked this month yet"
            description="Your monthly totals appear here once you add an activity this month."
          />
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            {summary.month}
          </p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-zinc-500 dark:text-zinc-400">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
