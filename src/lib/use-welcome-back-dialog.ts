'use client';

import { useEffect, useState } from 'react';
import type { IsoDate } from './types';

/**
 * ADR-009 §1.2 ④ "Welcome-back dialog" (D8: shown once per day on the first
 * open). Storage: `localStorage["sdt:welcome-back-shown:{uid}:{date}"]` set
 * the moment the dialog becomes eligible to show — not only when the student
 * closes it — so reloading the page later the same day never reopens it,
 * even if they left without clicking "Start today". The key is per `uid` (a
 * shared device keeps each account's flag separate) and per calendar date
 * (no explicit cleanup: a new date is simply a key that was never written).
 * Client-only and best-effort: if `localStorage` throws (private browsing),
 * the dialog is treated as already shown rather than crashing the page.
 */

function storageKey(uid: string, today: IsoDate): string {
  return `sdt:welcome-back-shown:${uid}:${today}`;
}

/** True once per `(uid, today)` pair until `markWelcomeBackShown` is called for it. */
export function useWelcomeBackEligibility(uid: string | null, today: IsoDate): boolean {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (!uid) {
      setEligible(false);
      return;
    }
    try {
      setEligible(window.localStorage.getItem(storageKey(uid, today)) === null);
    } catch {
      setEligible(false);
    }
  }, [uid, today]);

  return eligible;
}

/** Marks today's welcome-back dialog as shown for `uid`, so it won't reopen on reload. */
export function markWelcomeBackShown(uid: string, today: IsoDate): void {
  try {
    window.localStorage.setItem(storageKey(uid, today), String(Date.now()));
  } catch {
    // Best-effort — the dialog may reopen next reload, which is an
    // acceptable degradation when storage is unavailable.
  }
}
