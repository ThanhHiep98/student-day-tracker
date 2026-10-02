import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // hosting.spec.ts needs the Firebase Hosting emulator serving a built out/;
  // it runs via `pnpm test:e2e:hosting` (playwright.hosting.config.ts).
  testIgnore: 'hosting.spec.ts',
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
  webServer: {
    // Dedicated port for E2E, decoupled from `pnpm dev`'s default 3000 —
    // some dev environments (e.g. VS Code's port auto-forwarding) keep a
    // listener on 3000 that isn't actually the Next.js server, which makes
    // Playwright's reuseExistingServer check falsely "succeed" and every
    // test then hangs waiting on a dead proxy.
    command: 'PORT=3100 pnpm dev',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
  },
});
