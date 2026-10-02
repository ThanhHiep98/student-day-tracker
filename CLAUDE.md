# CLAUDE.md

Instructions for Claude Code (and the project's own subagents) working in this repository.

## Project

**Student Day Tracker** — an offline-first PWA where a student logs daily activities against a
category (Work / Study / Exercise / Entertainment, or their own), sees a "today" timeline and
summary on **Home**, browses past days on a calendar in **History**, and gets a narrative read of
where their time goes in **Insights**. Students sign in with Google; their data lives in Cloud
Firestore under `users/{uid}` with an offline cache, so the app keeps working without a network
after the first sign-in (`architecture/ADR-007-firebase.md`). Hosted on Firebase Hosting:
https://student-day-tracker.web.app.

- Product requirements (source of truth): [`requirement/Requirement.docx`](./requirement/Requirement.docx),
  structured summary at [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md).
- Technical design: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
  [`docs/DECISIONS.md`](./docs/DECISIONS.md) (ADR-001…006), [`architecture/`](./architecture/)
  (ADR-007 Firebase, ADR-008 onboarding, ADR-009 feedback loop + parent view).
- **Current status**: v1 (requirement sections 1–3) shipped 2026-10-01. v2
  (`requirement/Requirement.txt`, `docs/REQUIREMENTS.md` §4) per
  `plans/2026-10-01-v2-roadmap-cross-midnight.html`: slice 1 (cross-midnight) and F1 (Firebase
  Hosting + CI) shipped 2026-10-03; **F2 (Google sign-in, Firestore data layer, one-time Dexie
  migration, Security Rules; demo mode retired)** built on `feat/f2-auth-firestore`, live after
  merge + rules deploy. Next: slice 2 onboarding (ADR-008, accepted); slices 3/4/5/8 + F3 designed
  in ADR-009 (in review, GitHub issue #3). Details in `docs/ARCHITECTURE.md` → "Status".

## Tech stack

Next.js 16 (App Router, static export) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Firebase (Auth with Google, Cloud Firestore with persistent offline cache, Hosting; AI Logic +
App Check planned in F3) · Dexie (frozen, read only as the one-time migration source) · Serwist (`@serwist/next`, PWA) · `d3-scale`/`d3-time-format` (Insights charts,
no chart library) · Vitest · Playwright + `@axe-core/playwright` · Biome · pnpm.

## Repo structure

```
src/app/            Next.js routes: /  /history  /insights, layout, manifest, service worker
src/components/     Flat, co-located tests, no barrels
src/lib/            Firebase client, Firestore paths/converters/*-writes, pure helpers (+ tests), use-* hooks
tests/e2e/          Playwright against Auth + Firestore emulators: flows, a11y, hosting
tests/rules/        Security Rules tests (@firebase/rules-unit-testing, emulator)
tests/emulator/     Firestore integration + migration tests (emulator)
firestore.rules     Security Rules — deployed by the owner, not CI
docs/               REQUIREMENTS.md, ARCHITECTURE.md, DECISIONS.md (ADR-001…006)
architecture/       One .md per ADR from ADR-007 on (context/decision/consequences + Mermaid UD/AD)
requirement/        Original Requirement.docx (source of truth — don't edit; re-export instead)
plans/              HTML implementation plans produced by the planner agent
.claude/agents/      planner.md, implementer.md, tester.md
.claude/commands/    dev-flow.md — chains the three agents
```

## Coding Rules

*(Cumulative — the `planner` agent appends to this list as new conventions come up while
planning. Keep entries terse; don't restate what's already here.)*

- **TypeScript strict**, no `any` without a comment explaining why it's unavoidable.
- **Pure logic lives in `src/lib/*.ts`, tested without Firebase.** Any aggregation, validation, or
  formatting rule (e.g. `getDailySummary`, `buildMonthGrid`) is a plain function over
  arrays/primitives with a co-located `*.test.ts`. Firestore is exercised only in
  `tests/emulator/` and `tests/rules/` (`pnpm test:emulator`).
- **Dates are `YYYY-MM-DD` strings** (`IsoDate`), never `Date` objects, in stored data and store
  keys — see `docs/ARCHITECTURE.md`. Time-of-day is **minutes since midnight** (`0-1439`), not
  timestamps.
- **Dexie is frozen at `version(2)`** and read only as the one-time migration source; never add
  versions or write to it.
- **No barrel files** (no `index.ts` re-exports) and **no `utils/` dump folder** — every helper is
  a named module (`get-daily-summary.ts`, not `helpers.ts`).
- **Hooks live in `lib/` as `use-*.ts`**, not in a separate `hooks/` folder.
- **Styling uses only the design tokens** in `src/app/globals.css`
  (`--background`/`--surface`/`--surface-muted`/`--border`) — no new hardcoded colors outside a
  category's own `color` field.
- **A disabled "Coming soon" placeholder only loses `disabled` once the feature behind it actually
  works end-to-end.** Never ship a button that silently no-ops.
- **Zero axe-core violations** on every route — this is a CI-equivalent gate, not a suggestion.
- **Biome, not ESLint/Prettier**, for lint + format (`pnpm check` / `pnpm check:fix`).
- **Local dev without credentials:** `pnpm emulators` (Auth + Firestore, project `demo-sdt`) +
  `pnpm dev:emu`. Plain `pnpm dev` talks to the real project. Gates: `pnpm typecheck`, `check`,
  `test`, `test:emulator` (JDK 21), `build`, `test:e2e`, `test:e2e:hosting`.
- Commit messages and code comments in English; product/requirement language stays in Vietnamese
  where the source docx is Vietnamese — don't translate `docs/REQUIREMENTS.md`'s quoted
  requirement text.
- **Write-side pure builders are named `build*`, never `add*`** (`buildActivity`,
  `buildUpdatedActivity`, `buildCategory` in `build-activity.ts` / `build-category.ts`): they
  don't touch Firestore and receive `id`/`createdAt` as arguments; the caller writes through
  `*-writes.ts`.
  They throw synchronously on invalid input (empty name, start = end time, invalid date,
  unknown/duplicate category); the UI catches and shows the message inline, never silently drops
  input. Custom category names are deduped case-insensitively against all categories.
- **Pure helpers never read the clock** — `today`, `weekStart`, `monthStart` are passed in as
  `IsoDate` args. Weeks are **Monday-start calendar weeks** (matching History), months are
  calendar months.
- **Demo mode is retired** (F2): no demo seeding or banner. The `demo-` id prefix only marks old
  local rows that the migration skips.
- **Cross-midnight activities are stored as two per-day rows** sharing `spanId` (= the head row's
  `id`; the tail row's id is `${headId}-next`). `startMinutes` is 0-1439; `endMinutes` is
  end-exclusive 1-1440, where 1440 means "ends at midnight". Edit and delete always act on the
  whole span in one Firestore `writeBatch`. Anything that counts sessions (not minutes) counts
  distinct `spanId ?? id`. See `plans/2026-10-01-v2-roadmap-cross-midnight.html`.
- **Per-user data lives under `users/{uid}/…`** (activities, categories, goals, ratings, summaries);
  there is no `profileId` field.
- **Firestore era (F2+):** Firestore access lives only in `src/lib/firebase.ts`,
  `firestore-paths.ts`, `*-writes.ts`, `user-profile.ts`, `migrate-local-data.ts` and `use-*`
  hooks; write functions take a `UserScope` (`{ db, uid }`). Docs keep today's ids/fields (`id`
  field = doc id, ms numbers for timestamps, `ignoreUndefinedProperties`); multi-row writes (spans,
  migration) use `writeBatch` (≤500 ops). Security Rules changes ship with a
  `@firebase/rules-unit-testing` test on the emulator; rules field limits mirror `build*`
  validation.
- **Firestore UI writes are fire-and-forget:** never `await` a `commit()`/`setDoc` in a UI path
  (offline it resolves only on server ack) — wrap it in `trackWrite()` so `useSyncStatus` sees it;
  only the migration awaits commits. Queries filter on one field and sort client-side (no
  composite indexes). `DEFAULT_CATEGORIES` live in code and are merged by `useCategories`; only
  custom categories are stored. Emulator-only test hooks (`window.__sdtTest`) sit behind
  `NEXT_PUBLIC_FIREBASE_EMULATORS === '1'` and must not appear in `out/`. See
  `plans/2026-10-01-v2-roadmap-cross-midnight.html` §2.
- **No real Firebase credentials in tests:** emulators run with a `demo-*` project id
  (`demo-sdt`), the AI client is injected and mocked; only deploy jobs use the
  `FIREBASE_SERVICE_ACCOUNT_*` secret. The web `firebaseConfig` is public and committed; never
  commit or ask for service-account JSON, reCAPTCHA secrets, App Check debug tokens, or API keys.
- **Firebase Hosting is the only deploy target**, served from the domain root (no `basePath`);
  live on merge to `master`, preview channel per PR, checks run before deploy.
- **AI input is built by a pure `build*Prompt` helper from aggregated numbers only** (no names,
  emails, or free-text activity/category names), unit-tested for that; ≤1 call/user/day cached,
  rule-based fallback when offline, over quota, or without consent.

## Development workflow: Plan → Implement → Test

Feature work is built through three subagents, chained by `/dev-flow`:

```
        ┌──────────┐        ┌─────────────┐        ┌────────┐
 task → │ planner  │ ─────▶ │ implementer │ ─────▶ │ tester │
        └──────────┘        └─────────────┘        └────────┘
              ▲                                          │
              │            NEEDS WORK (slice was wrong)   │
              └──────────────────────────────────────────┘
                     NEEDS WORK (implementation gap) ↺ implementer
                                SHIP ↓
                              done — pick next slice
```

- **`planner`** (`.claude/agents/planner.md`) — reads `requirement/Requirement.docx` + the
  codebase, writes a concise, skimmable HTML plan to `plans/<date>-<slug>.html` following the
  "Plan template" below). May append new rules to this file's
  `## Coding Rules` section.
- **`implementer`** (`.claude/agents/implementer.md`) — reads the latest plan + this file, builds
  test-first (pure helper + test, then Firestore hook/writes + rules, then UI), runs
  `typecheck`/`check:fix`/`test`/`test:emulator`.
- **`tester`** (`.claude/agents/tester.md`) — runs the full suite (`typecheck`, `check`, `test`,
  `test:emulator`, `build`, `test:e2e`, `test:e2e:hosting`), grades it against the plan's success criteria and the requirement doc,
  reports `SHIP` or `NEEDS WORK` with specifics.

Run the whole chain with `/dev-flow [task description]`, or invoke an individual agent directly
when only one step is needed (e.g. re-running `tester` after a manual fix).

### Plan template

Every `plans/<date>-<slug>.html` follows the outline of `plans/2026-09-26-add-activity.html`
(user-guided; the `planner` agent enforces it):

- **Header**: `<h1>Plan: …</h1>` + `.meta` line (date / "updated" date, requirement §, related
  plans/ADRs as plain repo paths); once shipped, a bold status line or `.status` pill.
- **`1. Frontend`** → `1.1 Scope` (one intro line + **Trong scope** / **Ngoài scope** bullet lists in
  `ul.scope-list` — no dense paragraphs) · `1.2 Structure of UI` (sitemap diagram, then a mockup
  per screen *reconstructed from the requirement* in HTML/CSS/SVG `.mock*` classes with the app's
  real category colors — requirement images may be embedded base64 for confirmation — then a
  requirement § → component → status table) · `1.3 Task`.
- **`2. Backend`** → `2.1 Scope` · `2.2 Defaults (tạm chốt)` (# / Question / Default / Grounding —
  unanswered open questions get a grounded working default, not a blocking Q&A) ·
  `2.3 Requirements` (Section / User-visible behavior / Acceptance check) · `2.4 Flow` (diagram) ·
  `2.5 Tasks` · `2.6 Testing strategy` (Layer / Proves / File) · `2.7 Success criteria`.
  Drop `1.` or `2.` only when the slice has no UI or no data side, and say so in Scope.
- **Task tables**: Phase / Step / File(s) / Depends on / Risk (`.risk-low|med|high`).
- **Success criteria**: `ul.checklist` (☐); after a phase ships keep its list as
  `ul.checklist.done` (☑, "shipped, for reference") rather than deleting it.
- **Diagrams are inline SVG inside `.diagram`** — no Mermaid/JS/`<script>`, no external assets;
  the file must render offline. Callouts use `.note`.
- **New UI needs reviewable images before it is built.** When a slice adds or changes screens,
  `1.2 Structure of UI` embeds screenshots (base64 WebP, desktop 1280×800 + mobile 390×844)
  rendered with Playwright from the real app — live site or local build — with the new elements
  injected, so fonts, tokens and layout are real. One numbered figure per screen/state (①②…) with
  a caption, plus a `.review` callout asking the owner to approve by number. The owner approves
  before `2. Backend` starts; approved images are the acceptance reference in `2.7`.
- Vietnamese for section labels/defaults where the requirement is Vietnamese (Trong/Ngoài scope,
  tạm chốt); English for code, paths and acceptance checks.
