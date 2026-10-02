'use client';

import { useMemo } from 'react';
import { DEFAULT_CATEGORIES } from './default-categories';
import { categoriesCol } from './firestore-paths';
import type { Category } from './types';
import { useFirestoreQuery } from './use-firestore-query';

/**
 * Every category, oldest first: the code-defined defaults (createdAt 0–3,
 * never stored — plan §2.2 Q7) followed by the user's stored custom ones.
 * `undefined` while the custom categories load.
 */
export function useCategories(): Category[] | undefined {
  const custom = useFirestoreQuery('categories', (scope) => categoriesCol(scope));
  return useMemo(
    () =>
      custom && [
        ...DEFAULT_CATEGORIES,
        ...custom.filter((c) => !c.isDefault).sort((a, b) => a.createdAt - b.createdAt),
      ],
    [custom]
  );
}
