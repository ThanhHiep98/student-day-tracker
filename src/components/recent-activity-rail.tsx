import { formatMinutes } from '@/lib/get-daily-summary';
import type { Activity, Category } from '@/lib/types';

interface RecentActivityRailProps {
  activities: Activity[];
  categories: Category[];
}

const MAX_ITEMS = 4;

/** Compact "recent activity" rail for Home's right column (req. 1.1 full mockup). */
export function RecentActivityRail({ activities, categories }: RecentActivityRailProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const recent = [...activities].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_ITEMS);

  if (recent.length === 0) return null;

  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2
        id="recent-activity-heading"
        className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        Recent activity
      </h2>
      <ul className="mt-3 space-y-3">
        {recent.map((activity) => {
          const category = categoryById.get(activity.categoryId);
          return (
            <li key={activity.id} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${category?.color ?? '#a1a1aa'}22` }}
              >
                {category?.icon ?? '•'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{activity.name}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {category?.name ?? 'Uncategorized'} ·{' '}
                  {formatMinutes(activity.endMinutes - activity.startMinutes)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
