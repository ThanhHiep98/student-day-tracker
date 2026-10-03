import type { Category } from './types';

/**
 * Fixed starter categories from the product requirement (section 1.3):
 * Work, Study, Exercise, Entertainment. Seeded once on first run; users can
 * add their own on top but cannot delete these.
 *
 * `createdAt` is distinct per row (0,1,2,3), not just "seeded first" — Dexie
 * sorts `useCategories` by `createdAt`, and IndexedDB breaks ties on equal
 * index keys by primary key (`id`, alphabetical), which would silently
 * reorder this list to Entertainment/Exercise/Study/Work if every row shared
 * the same timestamp.
 */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'work', name: 'Work', color: '#6366f1', icon: '💼', isDefault: true, createdAt: 0 },
  { id: 'study', name: 'Study', color: '#f59e0b', icon: '📚', isDefault: true, createdAt: 1 },
  { id: 'exercise', name: 'Exercise', color: '#22c55e', icon: '🏃', isDefault: true, createdAt: 2 },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: '#ec4899',
    icon: '🎮',
    isDefault: true,
    createdAt: 3,
  },
  // ADR-008 §2.3 (onboarding habit questionnaire, D-B iii): new defaults that
  // back the five goal areas the wizard asks about. Kept out of the
  // questionnaire itself is "Work" (D9) — existing migrated data stays valid.
  { id: 'sleep', name: 'Sleep', color: '#7c3aed', icon: '😴', isDefault: true, createdAt: 4 },
  { id: 'school', name: 'School', color: '#0284c7', icon: '🏫', isDefault: true, createdAt: 5 },
  {
    id: 'extra-class',
    name: 'Extra class',
    color: '#ea580c',
    icon: '📝',
    isDefault: true,
    createdAt: 6,
  },
  {
    id: 'self-study',
    name: 'Self-study',
    color: '#0d9488',
    icon: '📖',
    isDefault: true,
    createdAt: 7,
  },
  { id: 'meals', name: 'Meals', color: '#65a30d', icon: '🍚', isDefault: true, createdAt: 8 },
];
