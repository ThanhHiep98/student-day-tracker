'use client';

import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { habitGoalsDoc } from './firestore-paths';
import type { HabitGoals } from './types';
import { useAuth } from './use-auth';

/**
 * Live `users/{uid}/goals/habits` doc (ADR-008 §2.5) — the `onSnapshot`
 * single-document counterpart to `useFirestoreQuery`'s collection queries.
 * `undefined` while loading (or signed out); `null` once loaded if the user
 * never started the questionnaire (drives the first-run wizard in
 * auth-gate.tsx); otherwise the stored goals.
 */
export function useHabitGoals(): HabitGoals | null | undefined {
  const { scope } = useAuth();
  const uid = scope?.uid ?? null;
  const [result, setResult] = useState<{ uid: string; data: HabitGoals | null } | null>(null);

  useEffect(() => {
    if (!scope) return;
    return onSnapshot(
      habitGoalsDoc(scope),
      (snapshot) => setResult({ uid: scope.uid, data: snapshot.exists() ? snapshot.data() : null }),
      (err) => {
        console.error('Habit goals query failed', err);
        setResult({ uid: scope.uid, data: null });
      }
    );
  }, [scope]);

  if (!uid) return undefined;
  return result !== null && result.uid === uid ? result.data : undefined;
}
