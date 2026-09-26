import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category } from '@/lib/types';
import { scaleLinear } from 'd3-scale';

interface WeeklyOverviewChartProps {
  days: { label: string; minutes: number }[];
  byCategory: { categoryId: string; minutes: number }[];
  categories: Category[];
}

const CHART_HEIGHT = 90;
const BAR_WIDTH = 22;
const GAP = 8;

/**
 * Req. 3.1 "Weekly Overview" — hours-per-day bar chart (d3-scale for the
 * height mapping, per ADR-003) plus a per-category breakdown for the week.
 */
export function WeeklyOverviewChart({ days, byCategory, categories }: WeeklyOverviewChartProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);
  const barHeight = scaleLinear().domain([0, maxMinutes]).range([0, CHART_HEIGHT]);
  const totalMinutes = byCategory.reduce((sum, c) => sum + c.minutes, 0);
  const chartWidth = days.length * (BAR_WIDTH + GAP);

  return (
    <section
      aria-labelledby="weekly-overview-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="weekly-overview-heading" className="text-sm font-semibold">
        Weekly overview
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr]">
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Hours per day
          </p>
          <svg
            role="img"
            aria-label={`Hours tracked per day this week: ${days
              .map((d) => `${d.label} ${formatMinutes(d.minutes)}`)
              .join(', ')}`}
            viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 20}`}
            width={chartWidth}
            className="mt-2"
          >
            {days.map((d, i) => {
              const h = barHeight(d.minutes);
              const x = i * (BAR_WIDTH + GAP);
              return (
                <g key={d.label}>
                  <rect
                    x={x}
                    y={CHART_HEIGHT - h}
                    width={BAR_WIDTH}
                    height={h}
                    rx={4}
                    fill="#818cf8"
                  />
                  <text
                    x={x + BAR_WIDTH / 2}
                    y={CHART_HEIGHT + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#71717a"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            This week
          </p>
          <p className="mt-1 text-xl font-semibold">{formatMinutes(totalMinutes)}</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {byCategory.map(({ categoryId, minutes }) => {
              const category = categoryById.get(categoryId);
              return (
                <li key={categoryId} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: category?.color ?? '#a1a1aa' }}
                  />
                  <span className="flex-1">{category?.name ?? categoryId}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">{formatMinutes(minutes)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
