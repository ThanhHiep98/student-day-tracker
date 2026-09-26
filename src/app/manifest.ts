import type { MetadataRoute } from 'next';

// Kept in sync with next.config.ts's basePath — Next doesn't rewrite
// manifest.ts's string URLs the way it does <Link>/<Image>, so this file
// has to apply the GitHub Pages project-site prefix itself.
const basePath = process.env.GITHUB_PAGES === 'true' ? '/student-day-tracker' : '';

// Required for `output: 'export'` — without it, Next treats the env-var
// read above as dynamic and refuses to prerender this route.
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Student Day Tracker',
    short_name: 'Day Tracker',
    description:
      'Offline-first daily activity tracker for students — timeline, calendar history, and insights. Installable PWA, works without a network.',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    categories: ['productivity', 'education', 'utilities'],
    icons: [
      {
        src: `${basePath}/icons/icon-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${basePath}/icons/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${basePath}/icons/icon-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
