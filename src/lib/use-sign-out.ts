'use client';

import { useState } from 'react';
import { deviceHasUnsyncedWrites, signOutAndClear } from './use-auth';

/**
 * Sign-out flow for the account menu (plan §1.3 phase 2, §2.2 Q6). Online →
 * sign out at once (queued writes get up to 5 s to sync). Offline with writes
 * the server hasn't seen → ask first, because clearing the cache loses them.
 */
export function useSignOut() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await signOutAndClear();
    } catch (err) {
      console.error('Sign out failed', err);
      setBusy(false);
    }
  }

  async function requestSignOut() {
    if (busy) return;
    if (!navigator.onLine && (await deviceHasUnsyncedWrites())) {
      setConfirmOpen(true);
      return;
    }
    await run();
  }

  return {
    busy,
    confirmOpen,
    requestSignOut,
    confirm: () => {
      setConfirmOpen(false);
      void run();
    },
    cancel: () => setConfirmOpen(false),
  };
}
