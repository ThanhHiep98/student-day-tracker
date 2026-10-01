import { defineConfig, devices } from '@playwright/test';

// Runs tests/e2e/hosting.spec.ts against firebase.json as Firebase Hosting
// would serve it. The emulator serves the existing out/, so run `pnpm build`
// first. Project `demo-sdt` is a fake demo-* id: no `firebase login`, no
// credentials. Set PLAYWRIGHT_BASE_URL to check a real preview/live URL
// instead (no emulator is started then).
const remoteBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'hosting.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: remoteBaseURL ?? 'http://localhost:5002',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: remoteBaseURL
    ? undefined
    : {
        command: 'pnpm emulators:hosting',
        url: 'http://localhost:5002',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
