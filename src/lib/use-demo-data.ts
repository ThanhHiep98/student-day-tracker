'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from './db';
import { buildDemoActivities } from './demo-activities';

const DEMO_DISMISSED_KEY = 'sdt-demo-dismissed';
const DEMO_IDS_KEY = 'sdt-demo-activity-ids';

/**
 * Seeds a week of demo activities straight into Dexie — once, app-wide —
 * instead of a Home-only session overlay, so Home/History (and eventually
 * Insights) all read the SAME data. Safe to call from every page: the
 * `activities.count()` check plus the dismissed flag make it a no-op after
 * the first successful seed, however many pages mount this hook.
 *
 * This is demo bootstrap content, not a simulated user write — same
 * category as default-categories.ts's `db.on('populate')` seed — so a real
 * `db.activities` write here doesn't cross the Frontend/Backend phase
 * boundary the way Add/Edit/Delete would (plan §1.1): nothing here fakes a
 * feature that isn't built yet, it just ships pre-loaded sample content.
 */
export function useDemoData() {
  const [isDemo, setIsDemo] = useState(false);
  const [seeding, setSeeding] = useState(true);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    (async () => {
      if (localStorage.getItem(DEMO_DISMISSED_KEY) === '1') {
        setSeeding(false);
        return;
      }

      const existingCount = await db.activities.count();
      if (existingCount > 0) {
        setIsDemo(localStorage.getItem(DEMO_IDS_KEY) !== null);
        setSeeding(false);
        return;
      }

      const demoActivities = buildDemoActivities();
      await db.activities.bulkAdd(demoActivities);
      localStorage.setItem(DEMO_IDS_KEY, JSON.stringify(demoActivities.map((a) => a.id)));
      setIsDemo(true);
      setSeeding(false);
    })();
  }, []);

  async function clearDemo() {
    const storedIds = localStorage.getItem(DEMO_IDS_KEY);
    if (storedIds) {
      const ids: string[] = JSON.parse(storedIds);
      await db.activities.bulkDelete(ids);
    }
    localStorage.removeItem(DEMO_IDS_KEY);
    localStorage.setItem(DEMO_DISMISSED_KEY, '1');
    setIsDemo(false);
  }

  return { isDemo, seeding, clearDemo };
}
