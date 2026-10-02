import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  // Static export — this app has no server (no API routes, no Server
  // Actions; see docs/DECISIONS.md ADR-001/002). Firebase Hosting serves
  // out/ from the domain root (firebase.json, architecture/ADR-007), so no
  // path prefix is configured. trailingSlash must match firebase.json's
  // `trailingSlash: true`.
  output: 'export',
  trailingSlash: true,
  // Dev only: keep the Next.js dev-tools badge off the sidebar's bottom-left
  // account block (⑤), where it would cover the button.
  devIndicators: { position: 'bottom-right' },
  // Always define the emulator flag (empty unless set), so production builds
  // inline `'' === '1'` and drop the emulator-only branch in src/lib/firebase.ts
  // (no `__sdtTest`, no emulator host in out/).
  env: {
    NEXT_PUBLIC_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS ?? '',
  },
};

export default withSerwist(nextConfig);
