/**
 * Core data model for Student Day Tracker.
 *
 * Two collections per user (Firestore `users/{uid}/categories` — custom only,
 * defaults live in code — and `users/{uid}/activities`, one tracked block of
 * time on a given day). `Activity.date` is an ISO `YYYY-MM-DD` string (not a
 * Date object) — it queries cleanly, sorts lexicographically, and avoids
 * timezone pitfalls when grouping by day for History and Insights.
 *
 * `startMinutes` (0-1439) / `endMinutes` (1-1440, end-exclusive; 1440 means
 * "ends at midnight") are minutes-since-midnight rather than full timestamps,
 * which keeps duration math (`end - start`) trivial and timezone-independent
 * within a single tracked day.
 *
 * An activity that crosses midnight is stored as two per-day rows sharing
 * `spanId` (= the head row's id; the tail row's id is `${headId}-next`), so
 * every row still lives on exactly one `date`. See activity-span.ts.
 */

export type IsoDate = string;

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  /** Fixed categories (Work / Study / Exercise / Entertainment) ship with the
   * app and cannot be deleted; user-created categories can. */
  isDefault: boolean;
  createdAt: number;
}

export interface Activity {
  id: string;
  categoryId: string;
  name: string;
  date: IsoDate;
  startMinutes: number;
  endMinutes: number;
  /** Set on both rows of a cross-midnight activity (= head row id); unset for same-day rows. */
  spanId?: string;
  createdAt: number;
}

/**
 * `users/{uid}` in Firestore (plan §2.4). Timestamps are ms numbers, like
 * `createdAt` above. `privacyAcceptedAt` = `createdAt`: the first sign-in is
 * the acceptance of the privacy notice linked from the sign-in screen.
 */
export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: number;
  privacyAcceptedAt: number;
  /** Set once this account received a device's local (Dexie) data. */
  migratedFromDexieAt?: number;
  /** F3 AI comments (ADR-009 §2.2 D10/D12) — the consent sheet's choice,
   * reversible any time from the account menu. Unset = never asked. */
  aiConsent?: { granted: boolean; at: number };
}

/**
 * `users/{uid}/goals/habits` (ADR-008 §2.3) — the onboarding questionnaire's
 * answers: the student's "chuẩn đầu vào" (baseline) that later slices (4
 * warnings, 5 % hiệu quả) read. One document per user, overwritten on every
 * save (D8 — no history). Times are minutes since midnight, durations in
 * minutes, timestamps in ms. `lastStep` is the wizard's resume point for the
 * Home banner (0 = not started / just skipped at welcome).
 */
export interface HabitGoals {
  version: 1;
  status: 'in-progress' | 'skipped' | 'completed';
  lastStep: 0 | 1 | 2 | 3 | 4 | 5;
  sleep: { targetMinutes: number; bedtimeMinutes: number; categoryId: string };
  /** `days`: 1 = Mon … 7 = Sun. Up to two blocks (morning / afternoon). */
  school: {
    days: number[];
    blocks: { startMinutes: number; endMinutes: number }[];
    categoryId: string;
  };
  extraClass: { targetMinutesPerDay: number; categoryId: string };
  selfStudy: { targetMinutesPerDay: number; categoryId: string };
  meals: { targetMinutesPerDay: number; categoryId: string };
  /** A cap, not a target; `null` means "no limit" (D3/D6). */
  entertainment: { maxMinutesPerDay: number | null; categoryId: string };
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

/**
 * `users/{uid}/dayRatings/{IsoDate}` (ADR-009 §2.3 D1/D2) — one 5-point
 * satisfaction rating per day, the doc id *is* the date so it isn't stored as
 * a field. `note` is optional, trimmed, and capped at 280 characters
 * (`build-day-rating.ts`'s `DAY_RATING_NOTE_MAX`); editable for today and the
 * previous 7 days (D2).
 */
export interface DayRating {
  score: 1 | 2 | 3 | 4 | 5;
  note?: string;
  updatedAt: number;
}

/**
 * `users/{uid}/aiComments/{IsoDate}` (ADR-009 §2.3 F3) — the Gemini weekly
 * comment cached for one calendar day (D11: at most one call per user per
 * day), doc id is the IsoDate it was generated for. `inputHash` identifies
 * the `AiInput` (build-ai-input.ts) it was generated from, for debugging
 * only — it is not re-checked to decide whether to call again.
 */
export interface AiComment {
  text: string;
  model: string;
  inputHash: string;
  createdAt: number;
}
