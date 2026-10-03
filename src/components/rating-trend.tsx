import type { RatingTrend as RatingTrendData } from '@/lib/get-rating-trend';
import type { DayRating } from '@/lib/types';

const EMOJI: Record<DayRating['score'], string> = {
  1: '😞',
  2: '🙁',
  3: '😐',
  4: '🙂',
  5: '😄',
};

function weekdayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

interface RatingTrendProps {
  trend: RatingTrendData;
}

/**
 * "How your days felt" (ADR-009 §1.2 ⑤) — one emoji per day this week, "–"
 * for untracked days (D7), and the average over rated days only. Insights'
 * `getRatingTrend` counterpart to the "% hiệu quả" section (out of scope
 * here).
 */
export function RatingTrend({ trend }: RatingTrendProps) {
  return (
    <section
      aria-labelledby="rating-trend-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2
        id="rating-trend-heading"
        className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        How your days felt
      </h2>

      <div
        role="img"
        aria-label={`How your days felt: ${trend.days
          .map(
            (d) => `${weekdayLabel(d.date)} ${d.score !== null ? `${d.score} of 5` : 'not rated'}`
          )
          .join(', ')}`}
        className="mt-4 grid grid-cols-7 gap-2 text-center"
      >
        {trend.days.map((day) => (
          <div key={day.date} aria-hidden className="flex flex-col items-center gap-1">
            <span className="text-2xl">{day.score !== null ? EMOJI[day.score] : '–'}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {weekdayLabel(day.date)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {trend.average !== null
          ? `Average ${trend.average.toFixed(1)} / 5.`
          : 'No ratings yet this week.'}
      </p>
    </section>
  );
}
