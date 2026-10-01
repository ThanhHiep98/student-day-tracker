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
- **Current status**: environment scaffold. Routing, data schema, and the read path work and are
  tested. Write flows and Insights' charts are placeholders — see `docs/ARCHITECTURE.md` →
  "Status" for exactly what's built vs. pending.

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
docs/               REQUIREMENTS.md, ARCHITECTURE.md, DECISIONS.md
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
  without rewriting stores.

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
  codebase, writes a concise, skimmable HTML plan to `plans/<date>-<slug>.html` (tables + one
  inline SVG diagram, success-criteria checklist). May append new rules to this file's
  `## Coding Rules` section.
- **`implementer`** (`.claude/agents/implementer.md`) — reads the latest plan + this file, builds
  test-first (pure helper + test, then Dexie/hook, then UI), runs `typecheck`/`check:fix`/`test`.
- **`tester`** (`.claude/agents/tester.md`) — runs the full suite (`typecheck`, `check`, `test`,
  `build`, `test:e2e`), grades it against the plan's success criteria and the requirement doc,
  reports `SHIP` or `NEEDS WORK` with specifics.

Run the whole chain with `/dev-flow [task description]`, or invoke an individual agent directly
when only one step is needed (e.g. re-running `tester` after a manual fix).
