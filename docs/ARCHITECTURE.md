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
                     Static hosting (Vercel)
                     ├─ Static HTML / JS / CSS (cached, immutable)
                     ├─ Service worker registered at /sw.js
                     └─ Manifest at /manifest.json
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                       Browser                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  React mounts on first paint                        │  │
│  │  Service worker precaches the app shell             │  │
│  │  Dexie opens IndexedDB → reads categories + activities │
│  │  Home / History / Insights render from that data    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Rendering strategy

A **client-rendered app shipped via Next.js static export**: no server, no route handlers, no
Server Actions. Pages are statically exported (crawlable title/description/OG/manifest); React
mounts client-side and Dexie takes over the data layer immediately. See ADR-001 for why no
backend at this scope.

## Data layer

**Dexie** is the single source of truth on the client. Two object stores — see
`src/lib/types.ts`:

```ts
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;   // Work / Study / Exercise / Entertainment ship seeded, can't be deleted
  createdAt: number;
}

interface Activity {
  id: string;
  categoryId: string;
  name: string;
  date: string;          // YYYY-MM-DD, indexed for Home/History/Insights lookups
  startMinutes: number;  // minutes since midnight
  endMinutes: number;
}
```

Two layers sit on top:

1. **`lib/db.ts`** — the Dexie client. Declares stores, indexes, and the default-category seed.
   Nothing else.
2. **Pure helper functions** (`lib/get-daily-summary.ts`, `lib/build-month-grid.ts`, and whatever
   Insights needs) — take plain arrays/primitives, return plain values. This is the testable
   surface; the React layer reads from Dexie via `use-activities.ts` / `use-categories.ts` and
   passes arrays into the helpers.

Why separate the two? Unit-testing helpers that take arrays needs nothing — no
`fake-indexeddb`, no async setup. The one place Dexie itself is exercised directly (schema,
indexes, seed) gets a single integration test with `fake-indexeddb`
(`lib/db.integration.test.ts`) and that's enough.

## PWA layer

Verified by:

- A `manifest.json` declaring name, icons, start URL, `standalone` display, theme color.
- A service worker precaching the app shell, serving it cache-first offline.
- Install criteria on Chrome/Edge desktop and Android, surfaced through a custom
  deferred-prompt banner (`components/install-banner.tsx`, `lib/use-install-prompt.ts`).

Built with **Serwist** (`@serwist/next`), the maintained successor to `next-pwa`. It compiles a
Workbox-based service worker from `src/app/sw.ts` into `public/sw.js` at build time. Serwist
needs webpack (not Turbopack), so `dev`/`build` pass `--webpack`.

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
3. **Categories + activities** → Dexie via `useLiveQuery` (`dexie-react-hooks`) — components
   re-render automatically when the underlying data changes.

## Testing strategy

| Layer | Tool | What we test |
|-------|------|--------------|
| Unit | Vitest | Pure helpers (`getDailySummary`, `buildMonthGrid`, `formatMinutes`) on plain arrays |
| Integration | Vitest + `fake-indexeddb` | Dexie schema, indexes, and the default-category seed |
| E2E | Playwright | Route rendering, nav between Home/History/Insights, calendar day selection |
| Accessibility | `@axe-core/playwright` | Zero violations on all three routes |
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

**Environment scaffold complete, feature build not started.** Tooling (Next.js, TypeScript,
Tailwind, Dexie, Serwist PWA, Vitest, Playwright + axe, Biome), the data schema, routing for the
three sections, and the read path (today's/selected-day activities, month calendar, empty states)
are in place and tested. Write flows (add/edit/delete activity, custom categories) and Insights'
charts/comparisons/cards are placeholders — see `docs/REQUIREMENTS.md` → "Out of scope for the
environment scaffold" and the agent workflow in `CLAUDE.md`.
