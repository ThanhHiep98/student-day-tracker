import { describe, expect, it } from 'vitest';
import { CUSTOM_CATEGORY_PALETTE, buildCategory } from './build-category';
import { DEFAULT_CATEGORIES } from './default-categories';
import type { Category } from './types';

const defaults: Category[] = [...DEFAULT_CATEGORIES];
const meta = { id: 'c1', createdAt: 500 };

describe('buildCategory', () => {
  it('builds a custom category with the trimmed name, tag icon and first palette color', () => {
    expect(buildCategory('  Volunteering ', defaults, meta)).toEqual({
      id: 'c1',
      createdAt: 500,
      name: 'Volunteering',
      icon: '🏷️',
      color: CUSTOM_CATEGORY_PALETTE[0],
      isDefault: false,
    });
  });

  it('rejects an empty name', () => {
    expect(() => buildCategory('   ', defaults, meta)).toThrow('Category name is required.');
  });

  it('caps the name at 50 characters (mirrors firestore.rules)', () => {
    expect(buildCategory('x'.repeat(50), defaults, meta).name).toHaveLength(50);
    expect(() => buildCategory('x'.repeat(51), defaults, meta)).toThrow(
      'Category name must be 50 characters or fewer.'
    );
  });

  it('dedupes case-insensitively against defaults and custom categories', () => {
    expect(() => buildCategory('work', defaults, meta)).toThrow('That category already exists.');
    const custom = buildCategory('Other', defaults, meta);
    expect(() => buildCategory(' OTHER ', [...defaults, custom], meta)).toThrow(
      'That category already exists.'
    );
  });

  it('cycles the palette by the number of existing custom categories', () => {
    const existing = [...defaults];
    const colors: string[] = [];
    for (let i = 0; i < 5; i++) {
      const c = buildCategory(`Custom ${i}`, existing, { id: `c${i}`, createdAt: i });
      colors.push(c.color);
      existing.push(c);
    }
    expect(colors).toEqual([...CUSTOM_CATEGORY_PALETTE, CUSTOM_CATEGORY_PALETTE[0]]);
  });

  it('exposes the four custom-category palette colors', () => {
    expect(CUSTOM_CATEGORY_PALETTE).toEqual(['#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316']);
  });
});
