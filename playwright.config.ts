import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // hosting.spec.ts needs the Firebase Hosting emulator serving a built out/;
  // it runs via `pnpm test:e2e:hosting` (playwright.hosting.config.ts).
  testIgnore: 'hosting.spec.ts',
  globalSetup: './tests/e2e/global-setup.ts',
  // Sign-in + first Firestore snapshot on a dev server: allow more than the 5 s default.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Auth + Firestore emulators, project demo-sdt: no credentials, nothing
      // real. Every test signs in as a fresh fake Google user
      // (tests/e2e/support/emulator.ts).
      command: 'pnpm emulators',
      // The Auth emulator answers here once both emulators are up.
      url: 'http://127.0.0.1:9099',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // SIGTERM lets the Firebase CLI stop its Java emulator; a hard kill
      // would orphan it on :8080.
      gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
    },
    {
      // Dedicated port for E2E, decoupled from `pnpm dev`'s default 3000 —
      // some dev environments (e.g. VS Code's port auto-forwarding) keep a
      // listener on 3000 that isn't actually the Next.js server, which makes
      // Playwright's reuseExistingServer check falsely "succeed" and every
      // test then hangs waiting on a dead proxy. The emulator flag points the
      // app at the emulators above and exposes window.__sdtTest.
      command: 'NEXT_PUBLIC_FIREBASE_EMULATORS=1 PORT=3100 pnpm dev',
      url: 'http://localhost:3100',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
