import type { Category } from './types';

/** Colors assigned to custom categories in creation order (plan §2.2 D4). */
export const CUSTOM_CATEGORY_PALETTE = ['#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316'] as const;

const CUSTOM_CATEGORY_ICON = '🏷️';

/**
 * Build a user-created category (req. 1.3 "user có thể thêm các mục riêng").
 * Pure — `id`/`createdAt` are passed in; the caller does `db.categories.add`.
 * Names are trimmed and deduped case-insensitively against every existing
 * category, defaults included.
 */
export function buildCategory(
  rawName: string,
  existing: Category[],
  meta: { id: string; createdAt: number }
): Category {
  const name = rawName.trim();
  if (!name) throw new Error('Category name is required.');
  const lower = name.toLowerCase();
  if (existing.some((c) => c.name.trim().toLowerCase() === lower)) {
    throw new Error('That category already exists.');
  }
  const customCount = existing.filter((c) => !c.isDefault).length;
  return {
    ...meta,
    name,
    icon: CUSTOM_CATEGORY_ICON,
    color: CUSTOM_CATEGORY_PALETTE[customCount % CUSTOM_CATEGORY_PALETTE.length],
    isDefault: false,
  };
}
