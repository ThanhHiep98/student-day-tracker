import type {
  Activity,
  AiComment,
  Category,
  DayRating,
  DaySummary,
  HabitGoals,
  UserProfile,
} from './types';

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

export function toDayRating(data: Record<string, unknown>): DayRating {
  const rating: DayRating = {
    score: data.score as DayRating['score'],
    updatedAt: data.updatedAt as number,
  };
  if (typeof data.note === 'string') rating.note = data.note;
  return rating;
}

/** `users/{uid}` (plan §2.4 + ADR-009 F3's `aiConsent`). Read-only helper —
 * writes go through `build-user-profile.ts`/`user-profile.ts` directly, not
 * `withConverter`, since some updates are partial merges. */
export function toUserProfile(data: Record<string, unknown>): UserProfile {
  const profile: UserProfile = {
    displayName: data.displayName as string,
    email: data.email as string,
    photoURL: (data.photoURL as string | null) ?? null,
    createdAt: data.createdAt as number,
    privacyAcceptedAt: data.privacyAcceptedAt as number,
  };
  if (typeof data.migratedFromDexieAt === 'number') {
    profile.migratedFromDexieAt = data.migratedFromDexieAt;
  }
  const aiConsent = data.aiConsent as { granted?: unknown; at?: unknown } | undefined;
  if (aiConsent && typeof aiConsent.granted === 'boolean' && typeof aiConsent.at === 'number') {
    profile.aiConsent = { granted: aiConsent.granted, at: aiConsent.at };
  }
  return profile;
}

export function toAiComment(data: Record<string, unknown>): AiComment {
  return {
    text: data.text as string,
    model: data.model as string,
    inputHash: data.inputHash as string,
    createdAt: data.createdAt as number,
  };
}

/** `users/{uid}/summaries/{date}` (ADR-009 §2.3, slice 8a) — built by `build-day-summary.ts`. */
export function toDaySummary(data: Record<string, unknown>): DaySummary {
  return {
    efficiency: data.efficiency as number | null,
    goals: data.goals as DaySummary['goals'],
    warnings: data.warnings as DaySummary['warnings'],
    ratingScore: data.ratingScore as number | null,
    updatedAt: data.updatedAt as number,
  };
}
