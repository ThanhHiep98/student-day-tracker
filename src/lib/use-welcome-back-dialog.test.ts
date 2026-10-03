import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { markWelcomeBackShown, useWelcomeBackEligibility } from './use-welcome-back-dialog';

afterEach(() => {
  window.localStorage.clear();
});

describe('useWelcomeBackEligibility (ADR-009 D8: once per day)', () => {
  it('is false while there is no signed-in user', async () => {
    const { result } = renderHook(() => useWelcomeBackEligibility(null, '2026-10-03'));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('is true for a user/date that has never been marked shown', async () => {
    const { result } = renderHook(() => useWelcomeBackEligibility('user-1', '2026-10-03'));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is false once markWelcomeBackShown has been called for that user/date', async () => {
    markWelcomeBackShown('user-1', '2026-10-03');
    const { result } = renderHook(() => useWelcomeBackEligibility('user-1', '2026-10-03'));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('keeps the flag separate per user on a shared device', async () => {
    markWelcomeBackShown('user-1', '2026-10-03');
    const { result } = renderHook(() => useWelcomeBackEligibility('user-2', '2026-10-03'));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('keeps the flag separate per date, so a new day is eligible again', async () => {
    markWelcomeBackShown('user-1', '2026-10-03');
    const { result } = renderHook(() => useWelcomeBackEligibility('user-1', '2026-10-04'));
    await waitFor(() => expect(result.current).toBe(true));
  });
});
