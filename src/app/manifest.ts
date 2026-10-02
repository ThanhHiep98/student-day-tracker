import type { MetadataRoute } from 'next';

// Firebase Hosting serves the app from the domain root (firebase.json,
// architecture/ADR-007), so every URL here is root-relative.

// Required for `output: 'export'` to prerender this route.
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Student Day Tracker',
    short_name: 'Day Tracker',
    description:
      'Daily activity tracker for students — timeline, calendar history, and insights. Sign in with Google to sync across devices; works offline.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    categories: ['productivity', 'education', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
