# CLAUDE.md

Instructions for Claude Code (and the project's own subagents) working in this repository.

## Project

**Student Day Tracker** — an offline-first PWA where a student logs daily activities against a
category (Work / Study / Exercise / Entertainment, or their own), sees a "today" timeline and
summary on **Home**, browses past days on a calendar in **History**, and gets a narrative read of
where their time goes in **Insights**. No backend, no auth — everything lives in IndexedDB via
Dexie on the device.

- Product requirements (source of truth): [`requirement/Requirement.docx`](./requirement/Requirement.docx),
  structured summary at [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md).
- Technical design: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
  [`docs/DECISIONS.md`](./docs/DECISIONS.md) (ADRs).
- **Current status**: v1 (requirement sections 1–3) shipped 2026-10-01 — Home's add/edit/delete
  and custom categories persist in Dexie, History reads the same data, Insights is computed from
  real data. v2 (`requirement/Requirement.txt`, `docs/REQUIREMENTS.md` §4) is in progress per
  `plans/2026-10-01-v2-roadmap-cross-midnight.html`: slice 1 (cross-midnight) shipped 2026-10-03; D-A is resolved by `architecture/ADR-007-firebase.md` (Firebase), planned in
  `plans/2026-10-01-firebase-setup.html` (F1 Hosting + CI first); D-B (goal ↔ category) decided 2026-10-03 = option (iii): seed new default categories **and** let each onboarding goal pick/remap a category. Details in
  `docs/ARCHITECTURE.md` → "Status".

## Tech stack

Next.js 16 (App Router, static export) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Dexie (IndexedDB) · Serwist (`@serwist/next`, PWA) · `d3-scale`/`d3-time-format` (Insights charts,
no chart library) · Vitest · Playwright + `@axe-core/playwright` · Biome · pnpm.

## Repo structure

```
src/app/            Next.js routes: /  /history  /insights, layout, manifest, service worker
src/components/     Flat, co-located tests, no barrels
src/lib/            Dexie client, pure helpers (+ tests), use-* hooks
tests/e2e/          Playwright: route smoke tests, a11y
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
- **Pure logic lives in `src/lib/*.ts`, tested without Dexie.** Any aggregation, validation, or
  formatting rule (e.g. `getDailySummary`, `buildMonthGrid`) is a plain function over
  arrays/primitives with a co-located `*.test.ts`. Dexie itself only gets exercised in
  `db.integration.test.ts` via `fake-indexeddb`.
- **Dates are `YYYY-MM-DD` strings** (`IsoDate`), never `Date` objects, in stored data and store
  keys — see `docs/ARCHITECTURE.md`. Time-of-day is **minutes since midnight** (`0-1439`), not
  timestamps.
- **Dexie schema changes are additive.** Add a new `.version(n).stores(...)` block in `db.ts`;
  never mutate an existing `.version()` call.
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
- Commit messages and code comments in English; product/requirement language stays in Vietnamese
  where the source docx is Vietnamese — don't translate `docs/REQUIREMENTS.md`'s quoted
  requirement text.
- **Write-side pure builders are named `build*`, never `add*`** (`buildActivity`,
  `buildUpdatedActivity`, `buildCategory` in `build-activity.ts` / `build-category.ts`): they
  don't touch Dexie and receive `id`/`createdAt` as arguments; the caller does the `db.*` write.
  They throw synchronously on invalid input (empty name, start = end time, invalid date,
  unknown/duplicate category); the UI catches and shows the message inline, never silently drops
  input. Custom category names are deduped case-insensitively against all categories.
- **Pure helpers never read the clock** — `today`, `weekStart`, `monthStart` are passed in as
  `IsoDate` args. Weeks are **Monday-start calendar weeks** (matching History), months are
  calendar months.
- **Demo rows are identified by an `id` prefix of `demo-`**, not by a schema field or a
  localStorage id list; clearing demo data deletes only `demo-*` rows.
- **Cross-midnight activities are stored as two per-day rows** sharing `spanId` (= the head row's
  `id`; the tail row's id is `${headId}-next`). `startMinutes` is 0-1439; `endMinutes` is
  end-exclusive 1-1440, where 1440 means "ends at midnight". Edit and delete always act on the
  whole span in one Dexie `rw` transaction. Anything that counts sessions (not minutes) counts
  distinct `spanId ?? id`. See `plans/2026-10-01-v2-roadmap-cross-midnight.html`.
- **Per-user data from v2 on (goals, ratings, stickers) is keyed by `profileId`**, which is
  `'local'` until the auth decision (D-A) lands, so that local profiles can be added later
  without rewriting stores. *(Obsolete once F2 ships: D-A is resolved by
  `architecture/ADR-007-firebase.md`; per-user data then lives under the `users/{uid}/…` path, with no
  `profileId` field. The Dexie rules above (additive `.version()`, `fake-indexeddb` integration
  test) also retire with F2; see `plans/2026-10-01-firebase-setup.html`.)*
- **Firestore era (F2+):** Firestore access lives only in `src/lib/firebase.ts` + `use-*` hooks;
  docs keep today's ids/fields; multi-row writes (spans, migration) use `writeBatch` (≤500 ops).
  Security Rules changes ship with a `@firebase/rules-unit-testing` test on the emulator.
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
  test-first (pure helper + test, then Dexie/hook, then UI), runs `typecheck`/`check:fix`/`test`.
- **`tester`** (`.claude/agents/tester.md`) — runs the full suite (`typecheck`, `check`, `test`,
  `build`, `test:e2e`), grades it against the plan's success criteria and the requirement doc,
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
