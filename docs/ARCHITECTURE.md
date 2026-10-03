# Architecture

Technical structure and key design decisions. Short by design — individual trade-offs live in
[`DECISIONS.md`](./DECISIONS.md); the product requirements this architecture serves live in
[`REQUIREMENTS.md`](./REQUIREMENTS.md).

## High-level overview

```
┌──────────────────────────────────────────────────────────┐
│                Next.js build (webpack, compile time)      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  TypeScript → ESM → tree-shake → minify             │  │
│  │  Tailwind   → purge → minify                        │  │
│  │  Static export (no SSR, no route handlers)          │  │
│  │  Service worker + manifest emitted alongside        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
                     Firebase Hosting (static, domain root)
                     ├─ Static HTML / JS / CSS (cached, immutable)
                     ├─ Service worker registered at /sw.js
                     └─ Manifest at /manifest.webmanifest
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                       Browser                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  React mounts on first paint                        │  │
│  │  Service worker precaches the app shell             │  │
│  │  Auth gate: Firebase Auth restores the session      │  │
│  │  Firestore (IndexedDB cache) → users/{uid}/…        │  │
│  │  Home / History / Insights render from that data    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                            │  sync when online
                            ▼
          Firebase Auth (Google) + Cloud Firestore (asia-southeast1)
```

## Rendering strategy

A **client-rendered app shipped via Next.js static export**: no server, no route handlers, no
Server Actions. Pages are statically exported (crawlable title/description/OG/manifest); React
mounts client-side. The Firebase JS SDK runs entirely in the browser (Auth + Firestore), so the
app stays a static export — see `architecture/ADR-007-firebase.md` (which supersedes ADR-001's
"no backend").

**Auth gate** (`components/auth-gate.tsx`, wrapped around every route by the server
`app/layout.tsx`): a full-page skeleton while Firebase restores the session (a signed-in user
never sees a flash of the sign-in screen), the sign-in screen for signed-out visitors on every
route except `/privacy/`, and the app shell (sidebar, bottom nav) once signed in. Sign-in is
Google only, popup first with a redirect fallback (`lib/use-auth.ts`); the first sign-in creates
the account (`users/{uid}` profile, `lib/user-profile.ts`).

## Data layer

**Cloud Firestore** (F2, `plans/2026-10-01-v2-roadmap-cross-midnight.html` §2) is the source of
truth, per signed-in user, with the SDK's **persistent multi-tab IndexedDB cache** — reads and
writes work offline after the first sign-in and sync when back online. Types in
`src/lib/types.ts`:

```
users/{uid}                    UserProfile: displayName, email, photoURL, createdAt,
                               privacyAcceptedAt (= createdAt), optional migratedFromDexieAt
users/{uid}/activities/{id}    Activity — `id` field = doc id
users/{uid}/categories/{id}    custom Category only (isDefault: false)
users/{uid}/goals/habits       HabitGoals — one fixed-id doc, the onboarding questionnaire's answers
```

```ts
interface Activity {
  id: string;
  categoryId: string;
  name: string;
  date: string;          // YYYY-MM-DD
  startMinutes: number;  // minutes since midnight, 0-1439
  endMinutes: number;    // end-exclusive, 1-1440 (1440 = "ends at midnight")
  spanId?: string;       // set on both rows of a cross-midnight activity (= head row id)
  createdAt: number;     // ms
}
```

The **default categories** live in code (`lib/default-categories.ts`) and are never stored;
`useCategories` returns them followed by the user's stored custom categories (sorted by
`createdAt`): the original four (Work / Study / Exercise / Entertainment) plus five more added for
the onboarding questionnaire (ADR-008) — Sleep 😴, School 🏫, Extra class 📝, Self-study 📖,
Meals 🍚. The frozen Dexie migration source (below) still seeds only the original four.

**Onboarding habit goals** (`architecture/ADR-008-onboarding-habits.md`) — a first-run wizard asks
five questions (sleep, school, study outside class, meals, entertainment cap) and stores the
answers as one document, `users/{uid}/goals/habits`:

```ts
interface HabitGoals {
  version: 1;
  status: 'in-progress' | 'skipped' | 'completed';
  lastStep: 0 | 1 | 2 | 3 | 4 | 5;         // resume point for the Home banner
  sleep: { targetMinutes: number; bedtimeMinutes: number; categoryId: string };
  school: { days: number[]; blocks: { startMinutes: number; endMinutes: number }[]; categoryId: string };
  extraClass: { targetMinutesPerDay: number; categoryId: string };
  selfStudy: { targetMinutesPerDay: number; categoryId: string };
  meals: { targetMinutesPerDay: number; categoryId: string };
  entertainment: { maxMinutesPerDay: number | null; categoryId: string }; // null = no limit
  createdAt: number; updatedAt: number; completedAt?: number;
}
```

Every section always has a value — the D3 "lớp 12" suggestion (`suggested-habit-goals.ts`) until
the student edits it — so the document is valid (`build-habit-goals.ts`) at every step, and
skipping/resuming never meets a blank field. `get-day-budget.ts` turns the six sections into the
review screen's 24h stacked bar (segment per goal, free time left, the "tight day" / "over 24h"
flags); `get-wake-time.ts` derives the wake-up time from bedtime + sleep target (reuses the
cross-midnight minutes-of-day math). The gate lives in `auth-gate.tsx`: a signed-in user with no
`goals/habits` doc sees the wizard full-page (replacing the whole app shell, not just the main
area) right after migration; `skipped`/`in-progress` show a dismissible Home banner instead
("Continue (n of 5)"); `completed` shows neither. The same six fields are editable anytime on
`/goals` ("Habits & goals", linked from the account menu), which always writes `status:
'completed'`. Slices 4–5 (warnings, % hiệu quả) are the only consumers planned so far —
`useHabitGoals()` is the live read.

**Cross-midnight activities** (v2 slice 1) are stored as two per-day docs: a head `start–1440` on
the start date and a tail `0–end` on the next day, both with `spanId` = the head's `id`; the
tail's id is `${headId}-next`. Every row lives on one `date`, so the daily/weekly/monthly helpers
and History lookups are unchanged and each day counts only its own minutes. Add, edit and delete
act on both docs in one `writeBatch` (`lib/activity-writes.ts`). Session counts count distinct
`spanId ?? id` (`lib/activity-span.ts`).

Layers:

1. **`lib/firebase.ts`** — lazy Auth/Firestore singletons (never initialised at module top level,
   because the static export prerenders in Node). With `NEXT_PUBLIC_FIREBASE_EMULATORS=1` on
   localhost it uses the Auth/Firestore emulators (project `demo-sdt`) and exposes the e2e hooks
   `window.__sdtTest` — dead code in production builds.
2. **`lib/firestore-paths.ts`** — `UserScope = { db, uid }` and the typed paths above (converters
   from `lib/firestore-converters.ts` keep exactly the known fields).
3. **Writes** (`lib/activity-writes.ts`, `lib/category-writes.ts`) take a `UserScope`. They are
   **fire-and-forget**: the batch is applied to the local cache at once (live queries re-render,
   the form closes) and handed to `trackWrite()` (`lib/use-sync-status.ts`), never awaited —
   offline, a commit only resolves on server ack. Validation stays in the pure `build*` helpers,
   which throw synchronously.
4. **Live hooks** (`use-activities.ts`, `use-activities-range.ts`, `use-categories.ts`) on a shared
   `use-firestore-query.ts` (`onSnapshot`); `undefined` while loading. Queries filter on one
   field and sort client-side — no composite indexes.
5. **Pure helper functions** (`get-daily-summary.ts`, `build-month-grid.ts`, the Insights helpers,
   `plan-dexie-migration.ts`, …) — plain arrays in, plain values out. This is the unit-tested
   surface.

**Security Rules** (`firestore.rules`, spec in `tests/rules/firestore.rules.test.ts` and
`tests/rules/habit-goals.test.ts`): each user reads/writes only `users/{uid}/**`; documents must
match the shapes above (key allowlists, `id` = doc id, date format, integer minutes, name limits
mirroring the builders: activity 200, category 50; `goals/habits` mirrors `build-habit-goals.ts`'s
D6 ranges, including the ≤24h planned-total check). Deployed by the owner
(`pnpm exec firebase deploy --only firestore:rules`), not by CI.

**One-time migration from Dexie** (`lib/migrate-local-data.ts`): pre-F2 builds kept everything
in a local Dexie database (`lib/db.ts`, now **frozen at `version(2)`** and only read). On the
first sign-in on a device, the auth gate copies its custom categories and non-demo activities
into the account — planned by the pure `planDexieMigration` (batches ≤ 500 writes, a span pair
never split, defaults/`demo-*`/already-stored ids skipped, same-name categories remapped), each
batch awaited, then `migratedFromDexieAt` on the profile, then the device marker
`localStorage['sdt-dexie-migrated']`. Only the first account on a device gets its local data.
Failures leave Dexie untouched and retry on the next start.

**Sign out** (`signOutAndClear`): waits ≤ 5 s for pending writes when online, signs out,
terminates Firestore and deletes its IndexedDB cache, then reloads — a shared family device keeps
nothing. Offline with unsynced writes, the account menu asks first.

## PWA layer

Verified by:

- A `manifest.json` declaring name, icons, start URL, `standalone` display, theme color.
- A service worker precaching the app shell, serving it cache-first offline.
- Install criteria on Chrome/Edge desktop and Android, surfaced through a custom
  deferred-prompt banner (`components/install-banner.tsx`, `lib/use-install-prompt.ts`).

Built with **Serwist** (`@serwist/next`), the maintained successor to `next-pwa`. It compiles a
Workbox-based service worker from `src/app/sw.ts` into `public/sw.js` at build time. Serwist
needs webpack (not Turbopack), so `dev`/`build` pass `--webpack`. Firebase traffic
(`*.googleapis.com`, `/__/*`) is `NetworkOnly` — listed before Serwist's `defaultCache`, whose
cross-origin rule would otherwise cache Auth/Firestore requests; Firestore caches offline data
itself.

## Deploy

**Firebase Hosting is the only deploy target** (`architecture/ADR-007-firebase.md`, slice F1 in
`plans/2026-10-01-firebase-setup.html`). GitHub Pages is retired: there is no `basePath`, and
the app is served from the domain root.

- **What's served:** the static export in `out/` (`pnpm build`). `firebase.json` sets
  `trailingSlash: true` (matching `next.config.ts`), so `/history` redirects to `/history/`, and
  unknown paths get `404.html` with status 404. There is no SPA rewrite, because every route is
  exported as its own `index.html`.
- **Cache headers:** `/sw.js` is `no-cache`, so service-worker updates reach users.
  `/_next/static/**` is `public, max-age=31536000, immutable`, because those files are
  content-hashed.
- **Workflows:** GitHub Actions runs typecheck, check, unit tests, the emulator tests
  (`pnpm test:emulator`, Java 21), and build, then
  `FirebaseExtended/action-hosting-deploy`. A merge to `master` deploys to the live channel.
  Each same-repo PR gets a preview channel (expires in 7 days), and its URL is posted as a PR
  comment. The service-account secret (`FIREBASE_SERVICE_ACCOUNT_STUDENT_DAY_TRACKER`) is
  referenced by name only; `.firebaserc` points at project `student-day-tracker`.
- **Live URL:** https://student-day-tracker.web.app (live since 2026-10-03, PR #1). The old
  GitHub Pages site was unpublished the same day; it held no real user data, so nothing needed
  migrating.
- **Local check, no credentials:** `pnpm build && pnpm test:e2e:hosting` starts the Hosting
  emulator (`pnpm emulators:hosting`, port 5002, fake project `demo-sdt`, no `firebase login`)
  and runs `tests/e2e/hosting.spec.ts`. That spec checks routes, the redirect, the 404, cache
  headers, the root-scoped manifest, and axe. To check a real preview/live URL instead, set
  `PLAYWRIGHT_BASE_URL`. The default `pnpm test:e2e` ignores this spec.

## Insights visualization

Requirement 3 explicitly avoids raw numbers ("Work = 20h") in favor of narrative ("bạn đang dành
thời gian cho điều gì?"). The plan for the charts (weekly overview, monthly overview, per-activity
analytics) is: compose `d3-scale` + `d3-time-format` directly, render SVG with React, same
approach as any other visualization in this codebase — no chart library. Not yet implemented;
see `src/app/insights/page.tsx` and `docs/REQUIREMENTS.md`.

## State management

No state library.

1. **Selected date (History)** → `useState` in the page.
2. **Theme** → `useState` mirrored to `localStorage`, anti-FOUC inline script in the layout.
3. **Auth state** → one `onAuthStateChanged` subscription in a small module store
   (`useAuth`, `useSyncExternalStore`).
4. **Categories + activities** → Firestore `onSnapshot` via `useFirestoreQuery` — components
   re-render automatically when the data changes, including this device's pending writes.
5. **Sync status** → a module store fed by `trackWrite()` (`useSyncStatus`: synced / pending /
   offline / error), shown in the account menu.

## Testing strategy

| Layer | Tool | What we test |
|-------|------|--------------|
| Unit | Vitest (`pnpm test`) | Pure helpers on plain arrays — summaries, builders (incl. name caps), `planDexieMigration` (0/500/501/600 ops, pairs at the boundary, skips, remaps, re-run = nothing), profile, given name, converters, sync status, `buildHabitGoals` (D6 boundaries), `getDayBudget`, `getWakeTime`, `suggestedHabitGoals`, default categories |
| Integration (Dexie) | Vitest + `fake-indexeddb` | The frozen migration source: schema, seed (still only the original four categories), indexes, v1 → v2 upgrade |
| Rules | `@firebase/rules-unit-testing` on the Firestore emulator (`pnpm test:emulator`) | Owner-only access on all four paths; malformed profiles/activities/categories/habit goals rejected |
| Integration (Firestore) | Real SDK on the Auth/Firestore emulators (`pnpm test:emulator`) | Writes at the §2.4 paths, span batches, range query, two devices on one account, migration (600 rows, progress, markers last, re-run, second account, failure), `saveHabitGoals` round-trip |
| E2E | Playwright + emulators (`pnpm test:e2e`) | Auth gate on every route, real popup sign-in creates the profile, migration dialog, offline add + sync, sign out clears the cache, Home/History/Insights flows after sign-in, onboarding wizard (walk all steps, skip/resume, offline save, Habits & goals edits, Re-run) |
| Accessibility | `@axe-core/playwright` | Zero violations on ①–④, ⑥, ⑧, `/privacy/`, all signed-in routes/dialogs, and the onboarding wizard/banner/Habits & goals page |
| Hosting | Playwright + Firebase Hosting emulator (`pnpm test:e2e:hosting`) | `firebase.json` routes (sign-in screen signed out), redirects, 404, cache headers, manifest scope |
| Lighthouse | Local, on demand | Spot-check; no CI gate |

Pure helpers get exhaustive unit tests because they're the brain of the app; everything else gets
high-confidence behavioral tests. Coverage on features not yet built is intentionally absent —
adding them is the Implement/Test agents' job, guided by the plan the Plan agent produces (see
[`CLAUDE.md`](../CLAUDE.md)).

## Folder conventions

- **Co-location.** A component's/helper's test file lives next to it, not in a parallel
  `__tests__/` folder.
- **No barrel files.** No `index.ts` re-exports. Import the named file directly.
- **No `utils/` dump folder.** Every utility is a named module: `get-daily-summary.ts`, not
  `helpers.ts`.
- **`use-*` naming** for hooks, living in `lib/` alongside other small utilities, not in a
  separate `hooks/` folder.

## Status

**v1 feature build: Frontend + Backend slices implemented** (`plans/2026-09-26-add-activity.html`).

- **Built:** Home's Add / Edit / Delete Activity and "+ New category" go through the pure builders
  `buildActivity` / `buildUpdatedActivity` / `buildCategory` (`src/lib/build-activity.ts`,
  `src/lib/build-category.ts`), which own validation and throw user-facing messages the form
  shows inline. History reads the same rows (read-only). Insights' five sections are computed
  from one live range query (`useActivitiesRange`) by pure helpers: `getWeeklySummary`,
  `getWeekToDateComparison` / `comparePeriods`, `buildInsightCards`, `getMonthlySummary`,
  `getActivityAnalytics`. Weeks are Mon–Sun, months are calendar months; Compare is
  week-to-date vs. the same weekdays last week.
- **v2 slice 1 — cross-midnight (built):** the Add/Edit form has a "Start date" field; an end
  time earlier than the start means "ends next day" and is stored as a two-row span (see Data
  layer). Editing can change an activity's date. Start = end is rejected.
- **v2 F1 — Firebase Hosting + CI (built).**
- **v2 F2 — account + Google sign-in (built; the owner deploys the rules, U10, before merge):**
  auth gate and sign-in screen, Firestore per user with offline cache, one-time Dexie migration,
  account menu (sidebar popover / mobile sheet) with sync status and sign out, `/privacy/`
  (Vietnamese), Security Rules + emulator tests. **Demo mode is retired:** a new account starts
  empty; the `demo-` id prefix only marks local rows the migration skips.
- **Deferred:** renaming/deleting custom categories, editing from History, overlap detection,
  in-app account deletion (F2 Q2).
- **v2 slice 2 — onboarding habit questionnaire (built; `architecture/ADR-008-onboarding-habits.md`):**
  first-run wizard (welcome → 5 questions → review, `components/onboarding-wizard.tsx` +
  `components/onboarding/*.tsx`) gated in `auth-gate.tsx`; Home banner when skipped/unfinished
  (`onboarding-banner.tsx`); `/goals` "Habits & goals" page to edit anytime, linked from the
  account menu. Five new default categories (Sleep, School, Extra class, Self-study, Meals).
  Pure helpers `buildHabitGoals`, `suggestedHabitGoals`, `getDayBudget`, `getWakeTime`; Firestore
  doc `users/{uid}/goals/habits` + Security Rules. Feeds slices 4 (warnings) and 5 (% hiệu quả),
  not yet built.
