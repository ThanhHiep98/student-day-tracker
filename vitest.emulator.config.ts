import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Rules + Firestore integration tests (plans/2026-10-01-v2-roadmap-cross-midnight.html §2.6).
// Run through `pnpm test:emulator`, which starts the Auth + Firestore emulators
// (project demo-sdt — no credentials) around this config. Node environment:
// the real modular SDK runs with an in-memory cache, Dexie on fake-indexeddb.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts', 'tests/emulator/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NEXT_PUBLIC_FIREBASE_EMULATORS: '1',
    },
  },
});
