import type { Activity, Category, HabitGoals } from './types';

/**
 * Shape guards between Firestore documents (or legacy Dexie rows) and the app
 * types. Pure — no Firebase import; firestore-paths.ts wraps these in
 * `withConverter`. Only the known fields survive, so a stray key never
 * reaches the Security Rules' key allowlist, and an absent `spanId` stays
 * absent (never `undefined` / `null`).
 */
export function toActivity(data: Record<string, unknown>): Activity {
  const activity: Activity = {
    id: data.id as string,
    categoryId: data.categoryId as string,
    name: data.name as string,
    date: data.date as string,
    startMinutes: data.startMinutes as number,
    endMinutes: data.endMinutes as number,
    createdAt: data.createdAt as number,
  };
  if (typeof data.spanId === 'string') activity.spanId = data.spanId;
  return activity;
}

export function toCategory(data: Record<string, unknown>): Category {
  return {
    id: data.id as string,
    name: data.name as string,
    color: data.color as string,
    icon: data.icon as string,
    isDefault: data.isDefault as boolean,
    createdAt: data.createdAt as number,
  };
}

export function toHabitGoals(data: Record<string, unknown>): HabitGoals {
  const goals: HabitGoals = {
    version: data.version as 1,
    status: data.status as HabitGoals['status'],
    lastStep: data.lastStep as HabitGoals['lastStep'],
    sleep: data.sleep as HabitGoals['sleep'],
    school: data.school as HabitGoals['school'],
    extraClass: data.extraClass as HabitGoals['extraClass'],
    selfStudy: data.selfStudy as HabitGoals['selfStudy'],
    meals: data.meals as HabitGoals['meals'],
    entertainment: data.entertainment as HabitGoals['entertainment'],
    createdAt: data.createdAt as number,
    updatedAt: data.updatedAt as number,
  };
  if (typeof data.completedAt === 'number') goals.completedAt = data.completedAt;
  return goals;
}
