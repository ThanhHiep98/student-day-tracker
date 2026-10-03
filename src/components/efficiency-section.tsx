import { goalCategoryId } from '@/lib/evaluate-day';
import type { WeekEfficiency, WeekGoalEfficiency } from '@/lib/get-efficiency';
import { fromIsoDate } from '@/lib/iso-date';
import type { Category, HabitGoals } from '@/lib/types';
import { EfficiencyRing } from './efficiency-ring';

interface EfficiencySectionProps {
  efficiency: WeekEfficiency;
  categories: Category[];
  habitGoals: HabitGoals;
}

function weekdayLabel(date: string): string {
  return fromIsoDate(date).toLocaleDateString(undefined, { weekday: 'short' });
}

const BAR_HEIGHT = 64;

function DayBar({ percent }: { percent: number | null }) {
  const height = percent === null ? 0 : Math.max(2, Math.round((percent / 100) * BAR_HEIGHT));
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: 36 }}>
      <span className="text-xs font-semibold">{percent !== null ? `${percent}%` : '–'}</span>
      <div
        className="flex w-5 items-end overflow-hidden rounded-full bg-surface-muted"
        style={{ height: BAR_HEIGHT }}
      >
        {percent !== null && (
          <div className="w-full rounded-full bg-indigo-600" style={{ height }} />
        )}
      </div>
    </div>
  );
}

function GoalBar({ goal, color }: { goal: WeekGoalEfficiency; color: string }) {
  const width = goal.percent ?? 0;
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span aria-hidden className="shrink-0">
        {goal.icon}
      </span>
      <span className="w-24 shrink-0 truncate">{goal.label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: goal.percent === null ? 'transparent' : color,
          }}
        />
      </span>
      <span className="w-10 shrink-0 text-right font-semibold">
        {goal.percent !== null ? `${goal.percent}%` : '–'}
      </span>
      <span className="hidden w-32 shrink-0 text-right text-xs text-zinc-500 sm:block dark:text-zinc-400">
        {goal.note}
      </span>
    </li>
  );
}

/**
 * Insights "% hiệu quả · this week" (ADR-009 §1.2 ⑤, D6/D7) — sits above
 * "How your days felt" and "Comments on your week" (the week comes from
 * `evaluateWeek`/`getWeekEfficiency`, same evaluation core slice 4 uses).
 * Untracked/not-yet-ended days show "–" (D7), excluded from the average. Each
 * goal's bar is colored by its own category (never a new hardcoded color).
 */
export function EfficiencySection({ efficiency, categories, habitGoals }: EfficiencySectionProps) {
  return (
    <section
      aria-labelledby="efficiency-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="efficiency-heading"
          className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          % hiệu quả &middot; this week
        </h2>
        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
          vs. Habits &amp; goals
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <EfficiencyRing
          percent={efficiency.average}
          srLabel={`This week's average: ${efficiency.average !== null ? `${efficiency.average}%` : 'not tracked'}`}
          caption="this week"
        />
        <div
          role="img"
          aria-label={`Daily % hiệu quả: ${efficiency.days
            .map(
              (d) =>
                `${weekdayLabel(d.date)} ${d.percent !== null ? `${d.percent}%` : 'not tracked'}`
            )
            .join(', ')}`}
          className="flex flex-1 flex-wrap justify-center gap-3 sm:justify-between"
        >
          {efficiency.days.map((day) => (
            <div key={day.date} aria-hidden className="flex flex-col items-center gap-1">
              <DayBar percent={day.percent} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {weekdayLabel(day.date)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-x-6 divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
        {efficiency.goals.map((goal) => (
          <GoalBar
            key={goal.key}
            goal={goal}
            color={
              categories.find((c) => c.id === goalCategoryId(habitGoals, goal.key))?.color ??
              '#a1a1aa'
            }
          />
        ))}
      </ul>
    </section>
  );
}
