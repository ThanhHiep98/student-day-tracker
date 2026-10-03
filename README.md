# Student Day Tracker

> Daily activity tracker for students — Home timeline, calendar History, and narrative
> Insights. Sign in with Google, synced across devices, works offline. Installable PWA.

![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/-Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Tailwind](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![PWA](https://img.shields.io/badge/-PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

## What this is

A tool for a student to answer, at a glance: **"Hôm nay mình đã dành thời gian cho những gì?"**
(*What did I spend today on?*) — log activities against a category (Work / Study / Exercise /
Entertainment, or your own), see them on a daily timeline, browse past days on a calendar, and
get a narrative read of where your time actually goes. Full product requirements:
[`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) (source: `requirement/Requirement.docx`).

**Current status:** v1 (Home / History / Insights) and v2 slices 1 (cross-midnight), F1
(Firebase Hosting) and F2 (Google sign-in, Firestore per user, one-time migration of local data)
are built; the rest of v2 is planned in
[`plans/2026-10-01-v2-roadmap-cross-midnight.html`](./plans/2026-10-01-v2-roadmap-cross-midnight.html).
See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) → "Status".

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 16** (App Router) | Static export, installable PWA, room for 3 routes |
| UI library | **React 19** | Stable in Next 16 |
| Language | **TypeScript** (strict mode) | Type safety end-to-end, including the Firestore documents |
| Styling | **Tailwind CSS v4** | Native CSS variables, no PostCSS config |
| Data + auth | **Firebase** — Auth (Google), Cloud Firestore with offline cache, Security Rules, AI Logic (Gemini) + App Check | Accounts, multi-device sync, offline after first sign-in, no server to run ([ADR-007](./architecture/ADR-007-firebase.md)) |
| Visualization | **D3 utilities** (`d3-scale`, `d3-time-format`) | Compose scales + SVG directly for Insights, no chart library |
| PWA | **Serwist** (`@serwist/next`) | Modern successor to `next-pwa` |
| State | **`useState` + Firestore live queries** | No global store |
| Testing | **Vitest** + **Playwright** + **`@axe-core/playwright`** + Firebase Emulator Suite (`@firebase/rules-unit-testing`) | Unit + rules + integration + E2E + a11y, no real credentials |
| Linting | **Biome** | Replaces ESLint + Prettier in one tool |

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/DECISIONS.md`](./docs/DECISIONS.md)
for the reasoning behind each choice.

## Local development

**Requirements:** Node.js 20+, pnpm 9+, and **Java 21** (for the Firebase emulators).

Develop against the local Auth + Firestore emulators (fake project `demo-sdt` — no
`firebase login`, no credentials, nothing touches the real project):

```bash
pnpm install
pnpm emulators    # terminal 1: Auth (9099) + Firestore (8080) emulators
pnpm dev:emu      # terminal 2: http://localhost:3000, pointed at the emulators
```

"Sign in with Google" then opens the Auth emulator's fake account picker ("Add new account" →
"Auto-generate user information"). Plain `pnpm dev` talks to the real `student-day-tracker`
project (real Google sign-in on `localhost`).

Other scripts:

```bash
pnpm build        # production build (Next.js, webpack — Serwist needs it)
pnpm start        # serve the production build
pnpm test         # unit tests (Vitest)
pnpm test:coverage
pnpm test:emulator     # Security Rules + Firestore integration tests (starts the emulators)
pnpm test:e2e     # E2E + a11y (Playwright; starts the emulators + dev server) — `npx playwright install` once first
pnpm test:e2e:hosting  # after `pnpm build`: E2E against the Firebase Hosting emulator (no login needed)
pnpm check        # Biome (lint + format)
pnpm typecheck    # tsc --noEmit
```

Security Rules (`firestore.rules`) are deployed by the project owner, not CI:
`pnpm exec firebase deploy --only firestore:rules --project student-day-tracker`.

### AI comments (F3) in local dev

`pnpm emulators` + `pnpm dev:emu` always use a mocked AI client (`window.__sdtTest.setAiReply`/
`setAiError`, emulator builds only) — no real Gemini call, no App Check. Against the **real**
project (plain `pnpm dev`), App Check (reCAPTCHA Enterprise) normally blocks calls from
`localhost`. To try the real Gemini call from a dev machine instead:

1. Firebase Console → **App Check → Apps → Student Day Tracker (Web) → Manage debug tokens** →
   add a debug token (a random UUID you generate yourself — do **not** reuse someone else's).
2. Run `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=<that-uuid> pnpm dev` and open the app from that
   machine. Never commit the token or add `localhost` to the reCAPTCHA key itself — the debug
   token is the only sanctioned way around it.

App Check enforcement for Firebase AI Logic itself is a separate, manual step the project owner
flips on in the console (App Check → APIs → Firebase AI Logic → Enforce) after a release is
verified live — it is off while the feature is rolled out.

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
│   ├── insights/page.tsx    # Insights: weekly/monthly overview, compare, cards, analytics
│   ├── privacy/page.tsx     # privacy notice (Vietnamese), readable signed out
│   ├── layout.tsx           # root layout, metadata, fonts, auth gate
│   ├── manifest.ts          # web app manifest
│   ├── sw.ts                # Serwist service worker source
│   └── globals.css          # Tailwind v4 import + design tokens
├── components/               # flat list, co-located tests, no barrels
└── lib/                      # Firebase client, pure helpers + hooks (Dexie = migration source only)
firestore.rules               # Security Rules (owner deploys)
tests/
├── rules/                    # Security Rules tests (emulator)
├── emulator/                 # Firestore integration tests (emulator)
└── e2e/                      # Playwright: auth, flows, a11y, hosting
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
