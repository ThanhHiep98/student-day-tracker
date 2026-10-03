'use client';

import { useUserProfile } from './use-user-profile';

/**
 * Whether AI comments are on (ADR-009 §2.2 D10/D12) — derived from the
 * profile's `aiConsent.granted`. `undefined` while the profile is still
 * loading; `false` once loaded with no consent recorded (never asked, or
 * withdrawn) — both render the same "off" state (§1.2 ⑥'s footer).
 */
export function useAiConsent(): boolean | undefined {
  const profile = useUserProfile();
  if (profile === undefined) return undefined;
  return profile?.aiConsent?.granted ?? false;
}
