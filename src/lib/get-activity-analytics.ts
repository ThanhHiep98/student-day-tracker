import { getTimeBucket } from './get-time-bucket';
import type { Activity } from './types';

export interface ActivityAnalytics {
  /** Grouping key: trimmed, lower-cased name. */
  key: string;
  /** Display name: the earliest occurrence's trimmed name. */
  name: string;
  totalMinutes: number;
  sessions: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  /** Most common 3-hour start bucket, e.g. `09:00–12:00`. */
  mostCommonTime: string;
}

/** Trimmed, case-insensitive grouping key for an activity name. */
export function activityNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Req. 3.4 Activity Analytics: group activities by name (trimmed,
 * case-insensitive) and summarise each group, sorted by total time desc.
 */
export function getActivityAnalytics(activities: Activity[]): ActivityAnalytics[] {
  const ordered = [...activities].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes
  );
  const groups = new Map<string, Activity[]>();
  for (const a of ordered) {
    const key = activityNameKey(a.name);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(a);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, group]): ActivityAnalytics => {
      const durations = group.map((a) => Math.max(0, a.endMinutes - a.startMinutes));
      const totalMinutes = durations.reduce((sum, d) => sum + d, 0);

      const bucketCounts = new Map<number, number>();
      for (const a of group) {
        const start = getTimeBucket(a.startMinutes).start;
        bucketCounts.set(start, (bucketCounts.get(start) ?? 0) + 1);
      }
      const [bestBucket] = [...bucketCounts.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]);

      return {
        key,
        name: group[0].name.trim(),
        totalMinutes,
        sessions: group.length,
        averageSessionMinutes: Math.round(totalMinutes / group.length),
        longestSessionMinutes: Math.max(...durations),
        mostCommonTime: getTimeBucket(bestBucket[0]).label,
      };
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes || a.name.localeCompare(b.name));
}
