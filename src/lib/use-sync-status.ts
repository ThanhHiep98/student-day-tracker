'use client';

import { type Firestore, waitForPendingWrites } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { useOnlineStatus } from './use-online-status';

/**
 * Sync status for the account menu (⑥ ⑧). UI writes are fire-and-forget —
 * offline, a Firestore `commit()` only resolves on server ack — so each one is
 * handed to `trackWrite()` instead of being awaited. A small module store
 * counts the writes still waiting for the server.
 */
export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

interface SyncState {
  pending: number;
  failed: boolean;
}

let state: SyncState = { pending: 0, failed: false };
const listeners = new Set<() => void>();

function update(next: SyncState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Pure: which status to show. A rejected write (e.g. rules) wins over everything else. */
export function deriveSyncStatus({
  pending,
  online,
  failed,
}: SyncState & { online: boolean }): SyncStatus {
  if (failed) return 'error';
  if (!online) return 'offline';
  if (pending > 0) return 'pending';
  return 'synced';
}

/**
 * Register a queued write. Never awaited by the UI; resolves when the server
 * acknowledged it. A failure is logged and shown as `error` until a later
 * write succeeds.
 */
export function trackWrite(write: Promise<unknown>): void {
  update({ ...state, pending: state.pending + 1 });
  write.then(
    () => update({ pending: state.pending - 1, failed: false }),
    (err: unknown) => {
      console.error('Firestore write failed', err);
      update({ pending: state.pending - 1, failed: true });
    }
  );
}

export function getPendingWriteCount(): number {
  return state.pending;
}

/** Test helper: forget all tracked writes. */
export function resetSyncStatus(): void {
  update({ pending: 0, failed: false });
}

export function useSyncStatus(): SyncStatus {
  const online = useOnlineStatus();
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
  return deriveSyncStatus({ ...current, online });
}

/**
 * True when this device holds writes the server hasn't acknowledged —
 * including ones queued before a reload, which `trackWrite` can't see.
 * `waitForPendingWrites` resolves at once when nothing is pending and hangs
 * while offline otherwise, so a short race tells the two apart.
 */
export async function hasUnsyncedWrites(db: Firestore, waitMs = 400): Promise<boolean> {
  if (state.pending > 0) return true;
  return Promise.race([
    waitForPendingWrites(db).then(
      () => false,
      () => true
    ),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), waitMs)),
  ]);
}
