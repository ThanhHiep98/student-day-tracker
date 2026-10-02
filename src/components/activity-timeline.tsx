import { EmptyState } from '@/components/empty-state';
import { isSpanTail } from '@/lib/activity-span';
import { formatMinutes } from '@/lib/get-daily-summary';
import type { Activity, Category } from '@/lib/types';

interface ActivityTimelineProps {
  activities: Activity[];
  categories: Category[];
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
}

/** HH:MM; an end of 1440 (midnight) renders as 00:00. */
/** Suffix for a row that is one half of a cross-midnight span. */
function spanSuffix(activity: Activity): string {
  if (activity.spanId === undefined) return '';
  return isSpanTail(activity) ? ' · from previous day' : ' · continues next day';
}

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Req. 1.2 "Today's Timeline" — the core of Home. Each row: icon, name,
 * category, start/end time, duration, edit/delete. A cross-midnight activity
 * shows only this day's part, labelled "continues next day" / "from previous
 * day"; Edit/Delete callers act on the whole span.
 *
 * Edit/Delete call back to the caller (`onEdit`/`onDelete`); omitting either
 * prop renders it disabled — History reuses this component read-only.
 */
export function ActivityTimeline({
  activities,
  categories,
  onEdit,
  onDelete,
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <EmptyState />;
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <section aria-labelledby="timeline-heading" className="space-y-2">
      <h2
        id="timeline-heading"
        className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        Today&apos;s timeline
      </h2>
      <ul className="space-y-2">
        {activities.map((activity) => {
          const category = categoryById.get(activity.categoryId);
          return (
            <li
              key={activity.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            >
              <span aria-hidden className="w-6 shrink-0 text-center text-base">
                {category?.icon ?? '•'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{activity.name}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {category?.name ?? 'Uncategorized'} · {formatClock(activity.startMinutes)}–
                  {formatClock(activity.endMinutes)}
                  {spanSuffix(activity)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {formatMinutes(activity.endMinutes - activity.startMinutes)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit?.(activity)}
                  disabled={!onEdit}
                  title={onEdit ? undefined : 'Not available here'}
                  className="rounded-full px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent dark:text-zinc-400"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(activity)}
                  disabled={!onDelete}
                  title={onDelete ? undefined : 'Not available here'}
                  className="rounded-full px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent dark:text-zinc-400"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
