'use client';

import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { aiCommentDoc } from './firestore-paths';
import type { AiComment, IsoDate } from './types';
import { useAuth } from './use-auth';

/**
 * Live `users/{uid}/aiComments/{date}` doc (ADR-009 §2.5 F3) — same shape as
 * `useDayRating`. `undefined` while loading (or signed out); `null` once
 * loaded if nothing is cached for `date` yet.
 */
export function useAiComment(date: IsoDate): AiComment | null | undefined {
  const { scope } = useAuth();
  const uid = scope?.uid ?? null;
  const fullKey = uid ? `${uid}|${date}` : null;
  const [result, setResult] = useState<{ key: string; data: AiComment | null } | null>(null);

  useEffect(() => {
    if (!scope) return;
    const key = `${scope.uid}|${date}`;
    return onSnapshot(
      aiCommentDoc(scope, date),
      (snapshot) => setResult({ key, data: snapshot.exists() ? snapshot.data() : null }),
      (err) => {
        console.error('AI comment query failed', err);
        setResult({ key, data: null });
      }
    );
  }, [scope, date]);

  if (!fullKey) return undefined;
  return result !== null && result.key === fullKey ? result.data : undefined;
}
