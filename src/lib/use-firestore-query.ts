'use client';

import { type Query, onSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import type { UserScope } from './firestore-paths';
import { useAuth } from './use-auth';

/**
 * Live Firestore query for the signed-in user — the `onSnapshot` replacement
 * for Dexie's `useLiveQuery` (ADR-007). Returns `undefined` while loading
 * (and while signed out), like the hooks it backs, then every snapshot —
 * including this device's own pending writes, so offline edits show at once.
 *
 * `key` names the query's inputs (e.g. `date=2026-10-03`); a new key
 * resubscribes and reports `undefined` until the new data arrives, so a page
 * never renders one day's rows under another day's heading.
 */
export function useFirestoreQuery<T>(
  key: string,
  buildQuery: (scope: UserScope) => Query<T>
): T[] | undefined {
  const { scope } = useAuth();
  const fullKey = scope ? `${scope.uid}|${key}` : null;
  const [result, setResult] = useState<{ key: string; data: T[] } | null>(null);
  const buildRef = useRef(buildQuery);
  buildRef.current = buildQuery;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    const current = scopeRef.current;
    if (fullKey === null || current === null) return;
    return onSnapshot(
      buildRef.current(current),
      (snapshot) => setResult({ key: fullKey, data: snapshot.docs.map((d) => d.data()) }),
      (err) => {
        console.error('Firestore query failed', err);
        setResult({ key: fullKey, data: [] });
      }
    );
  }, [fullKey]);

  return result !== null && result.key === fullKey ? result.data : undefined;
}
