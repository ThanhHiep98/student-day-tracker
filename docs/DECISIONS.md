# Architecture Decision Records (ADRs)

Lightweight records of architectural decisions. Each one is short on purpose: context, decision,
consequences.

---

## ADR-001: Dexie (IndexedDB) instead of a backend

**Status:** Superseded by [ADR-007](../architecture/ADR-007-firebase.md) (2026-10-01).

**Context:** A day-activity tracker is a natural excuse to build a backend — accounts, auth,
multi-device sync, reminders. The question is whether a backend earns its weight for a
single-device student tool.

**Decision:** No server, no auth, no sync. The data layer is **Dexie** (a typed wrapper over
IndexedDB), running entirely in the browser. Offline-first means *actually* offline-first, not
"offline-tolerant when the server is reachable."

**Why a backend would be overkill here:**

- **No multi-device requirement** in the current scope — one browser, one device.
- **No auth pressure.** No users means no login, no session, no PII to protect.
- **No always-online assumption.** A student should be able to log an activity with no signal.
- **IndexedDB is enough.** Dexie gives typed object stores, indexes for fast date queries,
  transactions, and migrations — exactly what activity data needs.

**Why a backend would be worth reconsidering later:**

- Multi-device sync (CRDTs or a server-mediated last-write-wins).
- Sharing a schedule with a teacher/parent.
- Cross-device or cross-user analytics.

**Consequences:**

- ✅ The "offline-first" claim is real and provable in airplane mode.
- ✅ Zero operational cost — no server to run, no database to back up.
- ✅ Forces a clean split between the Dexie client and pure helpers (helpers take arrays, return
  arrays), which makes the helpers trivial to unit-test.
- ⚠️ Data lives in the browser. Clearing site data wipes everything.
- ⚠️ No multi-device. Accepted at this scope.

---

## ADR-002: Next.js (not Vite)

**Context:** The app needs to be installable, ships a service worker, and has multiple routes
(Home / History / Insights) from day one.

**Decision:** Next.js 16, App Router, static export (no SSR, no Server Actions, no Route
Handlers).

**Why Next.js earns its weight here:**

- **PWA defaults on common static hosts** (Vercel and similar) — cache headers, manifest
  serving, service worker scope, immutable asset hashing.
- **App Router gives clean multi-route structure** (`/`, `/history`, `/insights`) without a
  separate router library.
- **First-class image/font handling** for the PWA icon set (192/512/maskable).

**Consequences:**

- ✅ PWA setup is mostly framework-driven, not hand-rolled.
- ✅ Adding routes (e.g. a per-activity analytics page) is essentially free.
- ⚠️ Bundle is larger than an equivalent Vite shell. Acceptable for installability + routing.
- ⚠️ Must not drift into SSR or Server Actions — would silently break the offline-first contract
  from ADR-001.
- ⚠️ Next 16 defaults to Turbopack, but Serwist needs webpack for the service worker build. Dev
  and build run with `--webpack` until Serwist ships Turbopack support (see
  [`ARCHITECTURE.md`](./ARCHITECTURE.md#pwa-layer)).

---

## ADR-003: D3 utilities for Insights, not a chart library

**Context:** Requirement 3 (Insights) needs weekly/monthly charts and per-activity trend views.
Libraries like `nivo`/`recharts`/`visx` would render something approximating them quickly.

**Decision:** Use `d3-scale` + `d3-time-format` only. Render SVG with React; build cell layout,
color scale, and time formatting by hand — same approach across the app, not just Insights.

**Why this matters here:**

- **Full control over a11y** — keyboard navigation, `aria-label` per data point, focus
  management — is easier to get right end-to-end than through a general-purpose chart library.
- **Bundle savings.** `d3-scale` + `d3-time-format` together are a few kB gzipped; `nivo`/`visx`
  bring much larger peer dependencies.
- **Consistency.** One rendering approach for every visualization in the app, not "chart library
  for some views, hand-rolled SVG for others."

**Why a chart library would be the right call elsewhere:**

- A dashboard with many chart types, each configured once and never customized.
- Production analytics at a scale where rendering/downsampling performance matters more than
  bespoke interaction.

**Consequences:**

- ✅ Bundle stays small; every interaction is debuggable end-to-end.
- ⚠️ More code to write and maintain than `<Chart data={...} />`. This is the Insights feature
  build's cost to pay — not yet incurred (Insights is still a placeholder, see
  `docs/REQUIREMENTS.md`).

---

## ADR-004: No global state library

**Context:** Many React projects reach for Zustand/Redux on day one. This one doesn't.

**Decision:** Local `useState` for ephemeral UI (selected date, theme, modal open/closed).
Dexie via `useLiveQuery` for categories/activities — it already subscribes components
automatically. No store.

**Consequences:**

- ✅ Smaller bundle.
- ✅ Clearer data flow — Dexie is the source of truth, `useState` handles UI-only state.
- ✅ Nothing "global" to chase when debugging.
- ⚠️ If cross-component coordination grows beyond prop-passing + Dexie subscriptions, revisit —
  not preemptively.

---

## ADR-005: Tailwind v4

**Context:** Styling approach affects velocity and consistency across three routes.

**Decision:** Tailwind CSS v4 with a design token layer in `app/globals.css`
(`--background`, `--surface`, `--border`, etc., consumed via `@theme inline`).

**Consequences:**

- ✅ No context switching between files when styling.
- ✅ Design tokens defined once, used as utility classes everywhere (Home, History, Insights).
- ✅ Dead-CSS purging is automatic.
- ✅ Dark mode via the `dark:` prefix, paired with the anti-FOUC inline script in `layout.tsx`.
- ⚠️ Class lists get long. Mitigated by extracting repeated patterns into components, not custom
  CSS classes.

---

## ADR-006: pnpm over npm

**Context:** Package manager choice affects install speed, disk usage, and CI duration.

**Decision:** pnpm (see `pnpm-workspace.yaml`).

**Consequences:**

- ✅ Faster installs than npm, disk-efficient via content-addressable storage.
- ✅ Strict dependency resolution catches phantom dependencies.
- ⚠️ Some legacy tools assume npm. Not hit so far.

---

## ADR-007: Firebase for auth, sync, hosting, and AI

Moved to its own file: [`architecture/ADR-007-firebase.md`](../architecture/ADR-007-firebase.md)
(includes use-case and activity diagrams). New ADRs from ADR-007 on live in `architecture/` as one
`.md` file each.
