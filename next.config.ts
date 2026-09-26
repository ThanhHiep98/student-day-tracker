import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

// GitHub Pages serves this repo as a project site at /student-day-tracker,
// not the domain root — GITHUB_PAGES is set only by
// .github/workflows/deploy.yml, never for local dev/build. src/app/manifest.ts
// applies the same basePath to its icon URLs, since Next doesn't rewrite
// manifest content automatically the way it does <Link>/<Image>.
const isGithubPages = process.env.GITHUB_PAGES === 'true';
export const basePath = isGithubPages ? '/student-day-tracker' : '';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  // Static export — this app has no server (no API routes, no Server
  // Actions; see docs/DECISIONS.md ADR-001/002) — needed to host on GitHub
  // Pages, which only serves static files.
  output: 'export',
  basePath,
  trailingSlash: true,
};

export default withSerwist(nextConfig);
