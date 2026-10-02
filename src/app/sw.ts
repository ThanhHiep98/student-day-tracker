/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Firebase Auth / Firestore traffic and the Auth helper pages (/__/auth/…)
    // must never be cached: defaultCache's cross-origin NetworkFirst rule would
    // otherwise store Firestore/Auth GETs. Firestore does its own offline
    // caching in IndexedDB. Listed first so it wins over defaultCache.
    {
      matcher: ({ url }) =>
        url.hostname.endsWith('googleapis.com') || url.pathname.startsWith('/__/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
