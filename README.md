# Student Day Tracker

> Offline-first daily activity tracker for students — Home timeline, calendar History, and
> narrative Insights. Installable PWA, no backend.

![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/-Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Tailwind](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)
![Dexie](https://img.shields.io/badge/-Dexie-FE5196?style=flat-square)
![PWA](https://img.shields.io/badge/-PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

## What this is

A tool for a student to answer, at a glance: **"Hôm nay mình đã dành thời gian cho những gì?"**
(*What did I spend today on?*) — log activities against a category (Work / Study / Exercise /
Entertainment, or your own), see them on a daily timeline, browse past days on a calendar, and
get a narrative read of where your time actually goes. Full product requirements:
[`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) (source: `requirement/Requirement.docx`).

**Current status: environment scaffold.** Tooling, data schema, routing, and the read path work
end-to-end and are tested. The write flows (add/edit/delete activity) and Insights'
charts/comparisons are placeholders, built next via the agent workflow below. See
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) → "Status".

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 16** (App Router) | Static export, installable PWA, room for 3 routes |
| UI library | **React 19** | Stable in Next 16 |
| Language | **TypeScript** (strict mode) | Type safety end-to-end, including the Dexie schema |
| Styling | **Tailwind CSS v4** | Native CSS variables, no PostCSS config |
| Data | **Dexie** (IndexedDB wrapper) | Lightweight, typed, offline-first, no backend |
| Visualization | **D3 utilities** (`d3-scale`, `d3-time-format`) | Compose scales + SVG directly for Insights, no chart library |
| PWA | **Serwist** (`@serwist/next`) | Modern successor to `next-pwa` |
| State | **`useState` + Dexie live queries** | No global store |
| Testing | **Vitest** + **Playwright** + **`@axe-core/playwright`** + **`fake-indexeddb`** | Unit + E2E + a11y |
| Linting | **Biome** | Replaces ESLint + Prettier in one tool |

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/DECISIONS.md`](./docs/DECISIONS.md)
for the reasoning behind each choice.

## Local development

**Requirements:** Node.js 20+ and pnpm 9+.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Other scripts:

```bash
pnpm build        # production build (Next.js, webpack — Serwist needs it)
pnpm start        # serve the production build
pnpm test         # unit tests (Vitest)
pnpm test:coverage
pnpm test:e2e     # end-to-end tests (Playwright + axe) — run `npx playwright install` once first
pnpm test:e2e:hosting  # after `pnpm build`: E2E against the Firebase Hosting emulator (no login needed)
pnpm check        # Biome (lint + format)
pnpm typecheck    # tsc --noEmit
```

## Deploy

The app is deployed to **Firebase Hosting** from GitHub Actions: a merge to `master` deploys it
live, and each PR gets a preview URL. Live URL: **https://student-day-tracker.web.app**. It replaces the old GitHub Pages deploy
(unpublished 2026-10-03). Details are in
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) under "Deploy".

## Project structure

```
src/
├── app/
│   ├── page.tsx             # Home: greeting, daily summary, today's timeline
│   ├── history/page.tsx     # History: month calendar → selected day's summary
│   ├── insights/page.tsx    # Insights: weekly/monthly overview, compare, cards (placeholders)
│   ├── layout.tsx           # root layout, metadata, fonts, nav bar
│   ├── manifest.ts          # web app manifest
│   ├── sw.ts                # Serwist service worker source
│   └── globals.css          # Tailwind v4 import + design tokens
├── components/               # flat list, co-located tests, no barrels
└── lib/                      # Dexie client + pure helpers + hooks
tests/
└── e2e/                      # Playwright: route smoke tests, a11y
docs/
├── REQUIREMENTS.md           # structured export of requirement/Requirement.docx
├── ARCHITECTURE.md
└── DECISIONS.md
requirement/
└── Requirement.docx          # original product requirement (source of truth)
```

## Development workflow: Plan → Implement → Test agents

Feature work (the write flows and Insights) is built through three Claude Code subagents defined
in [`.claude/agents/`](./.claude/agents/), chained by [`.claude/commands/dev-flow.md`](./.claude/commands/dev-flow.md):

```
planner  →  implementer  →  tester  → (back to planner if tester finds gaps)
```

- **`planner`** reads `requirement/Requirement.docx` + the current codebase and writes an HTML
  plan under `plans/`.
- **`implementer`** reads that plan + `CLAUDE.md`'s coding rules and writes the code + tests.
- **`tester`** runs `pnpm typecheck && pnpm check && pnpm test && pnpm test:e2e`, checks the
  result against the plan's success criteria, and reports pass/fail.

Full rules, conventions, and agent responsibilities: [`CLAUDE.md`](./CLAUDE.md).

## License

MIT — see [LICENSE](./LICENSE)
