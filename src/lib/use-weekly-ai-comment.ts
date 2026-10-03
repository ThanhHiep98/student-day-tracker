'use client';

import { useEffect, useRef, useState } from 'react';
import { AI_MODEL_ID, getAiClient } from './ai';
import { saveAiComment } from './ai-comment-writes';
import { buildAiComment } from './build-ai-comment';
import { type AiInput, hashAiInput } from './build-ai-input';
import { buildAiPrompt } from './build-ai-prompt';
import type { UserScope } from './firestore-paths';
import type { IsoDate } from './types';
import { useAiComment } from './use-ai-comment';
import { useOnlineStatus } from './use-online-status';

export type WeeklyAiCommentState =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'ready'; text: string; createdAt: number }
  | { status: 'fallback'; reason: 'offline' | 'error' };

interface UseWeeklyAiCommentArgs {
  scope: UserScope | null;
  /** From `useAiConsent()`; `undefined` while the profile is still loading. */
  consent: boolean | undefined;
  today: IsoDate;
  /** The numbers to send if a call is needed; `null` when there is nothing
   * tracked yet to build a comment from. Callers should memoize this so the
   * effect below doesn't re-run (and re-attempt) on every render. */
  input: AiInput | null;
}

/**
 * ADR-009 §2.2 D11/D12 F3 orchestration — "Comments on your week"'s Gemini
 * state: reads the cached `aiComments/{today}` doc, and if AI is on, nothing
 * is cached yet, and the device is online, calls Gemini exactly once per
 * `(uid, today)` and caches the result (so a second load this session, or
 * tomorrow, never calls again — D11). Any failure (offline, App Check, model
 * error, empty text from `buildAiComment`'s validation) resolves to a single
 * `fallback` state — never a retry loop, never thrown to the UI.
 */
export function useWeeklyAiComment({
  scope,
  consent,
  today,
  input,
}: UseWeeklyAiCommentArgs): WeeklyAiCommentState {
  const cached = useAiComment(today);
  const online = useOnlineStatus();
  const attemptedKeyRef = useRef<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const uid = scope?.uid ?? null;
  const key = uid ? `${uid}|${today}` : null;

  useEffect(() => {
    if (!scope || !key || consent !== true || input === null) return;
    if (cached === undefined || cached !== null) return; // still loading, or already cached
    if (!online) return;
    if (attemptedKeyRef.current === key) return;
    attemptedKeyRef.current = key;

    let cancelled = false;
    const prompt = buildAiPrompt(input);
    const inputHash = hashAiInput(input);
    getAiClient()
      .generate(prompt)
      .then((text) => {
        if (cancelled) return;
        const comment = buildAiComment(text, AI_MODEL_ID, inputHash, Date.now());
        saveAiComment(scope, today, comment);
      })
      .catch((err: unknown) => {
        console.warn('AI comment unavailable, falling back to rule-based comments', err);
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, key, consent, input, cached, online, today]);

  if (consent !== true) return { status: 'off' };
  if (cached === undefined) return { status: 'loading' };
  if (cached !== null) return { status: 'ready', text: cached.text, createdAt: cached.createdAt };
  if (!online) return { status: 'fallback', reason: 'offline' };
  if (failedKey === key) return { status: 'fallback', reason: 'error' };
  return { status: 'loading' };
}
