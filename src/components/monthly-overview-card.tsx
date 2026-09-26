import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category } from '@/lib/types';

interface MonthlyOverviewCardProps {
  month: string;
  totalMinutes: number;
  topCategory: { categoryId: string; minutes: number };
  mostActiveDay: string;
  mostCommonActivity: string;
  averagePerDayMinutes: number;
  categories: Category[];
}

/** Req. 3.3 "Monthly Overview" — rolled-up totals for the current month. */
export function MonthlyOverviewCard({
  month,
  totalMinutes,
  topCategory,
  mostActiveDay,
  mostCommonActivity,
  averagePerDayMinutes,
  categories,
}: MonthlyOverviewCardProps) {
  const topCategoryName =
    categories.find((c) => c.id === topCategory.categoryId)?.name ?? topCategory.categoryId;

  const rows: [string, string][] = [
    ['Tracked time', formatMinutes(totalMinutes)],
    ['Top category', `${topCategoryName} · ${formatMinutes(topCategory.minutes)}`],
    ['Most active day', mostActiveDay],
    ['Most common activity', mostCommonActivity],
    ['Average / day', formatMinutes(averagePerDayMinutes)],
  ];

  return (
    <section
      aria-labelledby="monthly-overview-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="monthly-overview-heading" className="text-sm font-semibold">
        Monthly overview
      </h2>
      <p className="mt-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {month}
      </p>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-zinc-500 dark:text-zinc-400">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
