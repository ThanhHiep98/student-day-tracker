import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category } from '@/lib/types';

interface DailySummaryCardProps {
  totalMinutes: number;
  byCategory: { categoryId: string; minutes: number }[];
  categories: Category[];
}

/**
 * Req. 1.1 "Daily summary": one big card — total tracked time, then a
 * horizontal bar per category sized by share of the day's total.
 */
export function DailySummaryCard({ totalMinutes, byCategory, categories }: DailySummaryCardProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <section
      aria-labelledby="daily-summary-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-zinc-900/[0.04] dark:shadow-none"
    >
      <h2
        id="daily-summary-heading"
        className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        Today
      </h2>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {formatMinutes(totalMinutes)}{' '}
        <span className="text-zinc-500 dark:text-zinc-400 text-base font-normal">tracked</span>
      </p>

      {byCategory.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {byCategory.map(({ categoryId, minutes }) => {
            const category = categoryById.get(categoryId);
            const share = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
            return (
              <li key={categoryId} className="flex items-center gap-3 text-sm">
                <span aria-hidden className="w-5 shrink-0 text-center">
                  {category?.icon ?? '•'}
                </span>
                <span className="w-28 shrink-0 truncate">{category?.name ?? categoryId}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${share}%`, backgroundColor: category?.color ?? '#71717a' }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-zinc-500 dark:text-zinc-400">
                  {formatMinutes(minutes)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
