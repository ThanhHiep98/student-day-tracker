'use client';

import { EmptyState } from '@/components/empty-state';
import type { ActivityAnalytics } from '@/lib/get-activity-analytics';
import { formatMinutes } from '@/lib/get-daily-summary';

interface ActivityAnalyticsPanelProps {
  activities: ActivityAnalytics[];
  /** Grouping key of the selected activity; falls back to the first row. */
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

/**
 * Req. 3.4 "Activity Analytics" — this month's activities grouped by name
 * (getActivityAnalytics), with a drill-down for one activity at a time.
 */
export function ActivityAnalyticsPanel({
  activities,
  selectedKey,
  onSelect,
}: ActivityAnalyticsPanelProps) {
  const selected = activities.find((a) => a.key === selectedKey) ?? activities[0];

  const rows: [string, string][] = selected
    ? [
        ['Total time', formatMinutes(selected.totalMinutes)],
        ['Sessions', String(selected.sessions)],
        ['Average session', formatMinutes(selected.averageSessionMinutes)],
        ['Longest session', formatMinutes(selected.longestSessionMinutes)],
        ['Most common time', selected.mostCommonTime],
      ]
    : [];

  return (
    <section
      aria-labelledby="activity-analytics-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="activity-analytics-heading" className="text-sm font-semibold">
        Activity analytics
      </h2>
      {activities.length === 0 && (
        <div className="mt-4">
          <EmptyState
            headingLevel="h3"
            title="No activities this month yet"
            description="Each activity you track this month gets its own breakdown here."
          />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {activities.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => onSelect(a.key)}
            aria-pressed={a.key === selected?.key}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors motion-reduce:transition-none ${
              a.key === selected?.key
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-surface-muted text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>
      {selected && (
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-zinc-500 dark:text-zinc-400">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
