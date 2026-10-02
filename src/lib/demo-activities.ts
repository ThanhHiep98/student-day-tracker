import type { Activity } from './types';

/**
 * Pre-F2 builds seeded a demo week into Dexie with ids prefixed `demo-`. Demo
 * mode is retired (plan §2.2 Q9: a new account starts empty); the prefix now
 * only marks local rows the one-time migration must not copy into an account
 * (§2.2 Q4).
 */
export const DEMO_ID_PREFIX = 'demo-';

export function isDemoActivity(activity: Pick<Activity, 'id'>): boolean {
  return activity.id.startsWith(DEMO_ID_PREFIX);
}
