import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category } from '@/lib/types';

interface ComparePanelProps {
  current: { categoryId: string; minutes: number }[];
  previous: { categoryId: string; minutes: number }[];
  categories: Category[];
}

/**
 * Req. 3.2 "Compare" — framed as a delta with context, never good/bad
 * (e.g. "+2h 35m vs. last week"), per the requirement's own guidance.
 */
export function ComparePanel({ current, previous, categories }: ComparePanelProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const previousById = new Map(previous.map((p) => [p.categoryId, p.minutes]));

  return (
    <section
      aria-labelledby="compare-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="compare-heading" className="text-sm font-semibold">
        Compare
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">This week vs. last week</p>
      <ul className="mt-3 space-y-2.5 text-sm">
        {current.map(({ categoryId, minutes }) => {
          const category = categoryById.get(categoryId);
          const prevMinutes = previousById.get(categoryId);
          if (prevMinutes === undefined) return null;
          const delta = minutes - prevMinutes;
          const deltaLabel =
            delta === 0
              ? 'same as last week'
              : `${delta > 0 ? '+' : '−'}${formatMinutes(Math.abs(delta))} vs. last week`;
          return (
            <li key={categoryId} className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 font-medium" style={{ color: category?.color }}>
                {category?.name ?? categoryId}
              </span>
              <span>{formatMinutes(prevMinutes)}</span>
              <span aria-hidden className="text-zinc-400">
                →
              </span>
              <span>{formatMinutes(minutes)}</span>
              <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">{deltaLabel}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
