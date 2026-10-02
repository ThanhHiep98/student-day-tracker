import type { CompareResult, CompareRow } from '@/lib/compare-periods';
import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category } from '@/lib/types';

interface ComparePanelProps {
  result: CompareResult;
  categories: Category[];
}

function describeRow(row: CompareRow, name: string): string {
  switch (row.trend) {
    case 'new':
      return 'new this week';
    case 'same':
      return `same time on ${name} as the same days last week`;
    case 'more':
      return `+${formatMinutes(row.deltaMinutes)} more on ${name} than the same days last week`;
    case 'less':
      return `${formatMinutes(-row.deltaMinutes)} less on ${name} than the same days last week`;
  }
}

/**
 * Req. 3.2 "Compare" — this week so far vs. the same weekdays last week
 * (comparePeriods). Framed as a neutral delta with context, never good/bad
 * and never red/green, per the requirement's own guidance.
 */
export function ComparePanel({ result, categories }: ComparePanelProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <section
      aria-labelledby="compare-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="compare-heading" className="text-sm font-semibold">
        Compare
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        This week so far vs. the same days last week
      </p>
      {result.kind === 'no-previous' ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Nothing tracked in the same days last week yet — comparisons start once you have two weeks
          of data.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5 text-sm">
          {result.rows.map((row) => {
            const category = categoryById.get(row.categoryId);
            const name = category?.name ?? row.categoryId;
            return (
              <li key={row.categoryId} className="flex flex-wrap items-center gap-2">
                <span className="flex w-32 shrink-0 items-center gap-2 font-medium">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: category?.color }}
                  />
                  {name}
                </span>
                <span>{formatMinutes(row.previous)}</span>
                <span aria-hidden className="text-zinc-400">
                  →
                </span>
                <span>{formatMinutes(row.current)}</span>
                <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                  {describeRow(row, name)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
