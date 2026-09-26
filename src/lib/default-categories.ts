import type { Category } from './types';

/**
 * Fixed starter categories from the product requirement (section 1.3):
 * Work, Study, Exercise, Entertainment. Seeded once on first run; users can
 * add their own on top but cannot delete these.
 */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'work', name: 'Work', color: '#6366f1', icon: '💼', isDefault: true, createdAt: 0 },
  { id: 'study', name: 'Study', color: '#f59e0b', icon: '📚', isDefault: true, createdAt: 0 },
  { id: 'exercise', name: 'Exercise', color: '#22c55e', icon: '🏃', isDefault: true, createdAt: 0 },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: '#ec4899',
    icon: '🎮',
    isDefault: true,
    createdAt: 0,
  },
];
