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
};

export default withSerwist(nextConfig);
