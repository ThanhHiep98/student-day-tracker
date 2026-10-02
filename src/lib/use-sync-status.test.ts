import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  deriveSyncStatus,
  getPendingWriteCount,
  resetSyncStatus,
  trackWrite,
  useSyncStatus,
} from './use-sync-status';

function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: online });
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

afterEach(() => {
  resetSyncStatus();
  setOnline(true);
});

describe('deriveSyncStatus', () => {
  it('prioritises error, then offline, then pending', () => {
    expect(deriveSyncStatus({ pending: 0, online: true, failed: false })).toBe('synced');
    expect(deriveSyncStatus({ pending: 2, online: true, failed: false })).toBe('pending');
    expect(deriveSyncStatus({ pending: 2, online: false, failed: false })).toBe('offline');
    expect(deriveSyncStatus({ pending: 0, online: false, failed: false })).toBe('offline');
    expect(deriveSyncStatus({ pending: 0, online: false, failed: true })).toBe('error');
  });
});

describe('trackWrite + useSyncStatus', () => {
  it('is pending while a write waits for the server, synced once it resolves', async () => {
    const { result } = renderHook(() => useSyncStatus());
    expect(result.current).toBe('synced');

    const write = deferred();
    act(() => trackWrite(write.promise));
    expect(result.current).toBe('pending');
    expect(getPendingWriteCount()).toBe(1);

    await act(async () => write.resolve());
    expect(result.current).toBe('synced');
    expect(getPendingWriteCount()).toBe(0);
  });

  it('shows offline while the browser is offline', () => {
    const { result } = renderHook(() => useSyncStatus());
    act(() => setOnline(false));
    expect(result.current).toBe('offline');
    act(() => setOnline(true));
    expect(result.current).toBe('synced');
  });

  it('turns to error when a write is rejected, and recovers on the next successful write', async () => {
    const { result } = renderHook(() => useSyncStatus());
    const bad = deferred();
    act(() => trackWrite(bad.promise));
    await act(async () => bad.reject(new Error('permission-denied')));
    expect(result.current).toBe('error');

    const good = deferred();
    act(() => trackWrite(good.promise));
    await act(async () => good.resolve());
    expect(result.current).toBe('synced');
  });
});
