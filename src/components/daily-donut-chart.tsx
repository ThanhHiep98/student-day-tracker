import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category } from '@/lib/types';

interface DailyDonutChartProps {
  totalMinutes: number;
  byCategory: { categoryId: string; minutes: number }[];
  categories: Category[];
}

const SIZE = 140;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Donut companion to DailySummaryCard's bars — req. 1.1 "TỔNG QUAN HÔM NAY"
 * in the full desktop mockup. Same data, a different read of it.
 */
export function DailyDonutChart({ totalMinutes, byCategory, categories }: DailyDonutChartProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  let cumulative = 0;
  const segments = byCategory.map(({ categoryId, minutes }) => {
    const dash = totalMinutes > 0 ? (minutes / totalMinutes) * CIRCUMFERENCE : 0;
    const segment = {
      categoryId,
      color: categoryById.get(categoryId)?.color ?? '#a1a1aa',
      dash,
      offset: cumulative,
    };
    cumulative += dash;
    return segment;
  });

  return (
    <section
      aria-labelledby="daily-donut-heading"
      className="flex flex-col items-center rounded-2xl border border-border bg-surface p-5"
    >
      <h2
        id="daily-donut-heading"
        className="self-start text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        Today overview
      </h2>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`Total tracked today: ${formatMinutes(totalMinutes)}`}
        className="mt-3"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={STROKE}
        />
        {segments.map((s) => (
          <circle
            key={s.categoryId}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={`${s.dash} ${CIRCUMFERENCE - s.dash}`}
            strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        ))}
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 3}
          textAnchor="middle"
          fontSize={17}
          fontWeight={700}
          fill="currentColor"
        >
          {formatMinutes(totalMinutes)}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 15} textAnchor="middle" fontSize={10} fill="#71717a">
          tracked
        </text>
      </svg>
    </section>
  );
}
