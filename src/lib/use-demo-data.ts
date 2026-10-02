'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { db } from './db';
import { DEMO_ID_PREFIX, buildDemoActivities } from './demo-activities';
import { toIsoDate } from './iso-date';

const DEMO_DISMISSED_KEY = 'sdt-demo-dismissed';
/** Pre-`demo-` prefix builds stored seeded ids here; only read for cleanup now. */
const LEGACY_DEMO_IDS_KEY = 'sdt-demo-activity-ids';

function readLegacyDemoIds(): string[] {
  const stored = localStorage.getItem(LEGACY_DEMO_IDS_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Delete every demo row (`demo-` id prefix) plus any legacy demo ids, and
 * nothing else — activities the user added survive (plan §2.2 D7).
 */
export async function deleteDemoActivities(legacyIds: string[] = []): Promise<void> {
  await db.transaction('rw', db.activities, async () => {
    await db.activities.where('id').startsWith(DEMO_ID_PREFIX).delete();
    if (legacyIds.length > 0) await db.activities.bulkDelete(legacyIds);
  });
}

/**
 * Seeds a week of demo activities straight into Dexie — once, app-wide — so
 * Home, History and Insights all read the SAME data. Safe to call from every
 * page: the `activities.count()` check plus the dismissed flag make it a
 * no-op after the first successful seed.
 *
 * `isDemo` is derived from live data: true while the user hasn't dismissed
 * demo mode and at least one `demo-` row (or legacy demo id) still exists.
 */
export function useDemoData() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [hasLegacyIds, setHasLegacyIds] = useState(false);
  const [seeding, setSeeding] = useState(true);
  const hasCheckedRef = useRef(false);

  const demoCount = useLiveQuery(
    () => db.activities.where('id').startsWith(DEMO_ID_PREFIX).count(),
    []
  );

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    (async () => {
      const isDismissed = localStorage.getItem(DEMO_DISMISSED_KEY) === '1';
      setDismissed(isDismissed);
      setHasLegacyIds(readLegacyDemoIds().length > 0);
      if (isDismissed) {
        setSeeding(false);
        return;
      }

      const existingCount = await db.activities.count();
      if (existingCount === 0) {
        await db.activities.bulkAdd(buildDemoActivities(toIsoDate(new Date()), Date.now()));
      }
      setSeeding(false);
    })();
  }, []);

  async function clearDemo() {
    await deleteDemoActivities(readLegacyDemoIds());
    localStorage.removeItem(LEGACY_DEMO_IDS_KEY);
    localStorage.setItem(DEMO_DISMISSED_KEY, '1');
    setHasLegacyIds(false);
    setDismissed(true);
  }

  const isDemo = dismissed === false && ((demoCount ?? 0) > 0 || hasLegacyIds);

  return { isDemo, seeding, clearDemo };
}
