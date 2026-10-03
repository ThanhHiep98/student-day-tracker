import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './default-categories';

describe('DEFAULT_CATEGORIES', () => {
  it('keeps the original four Work/Study/Exercise/Entertainment first, oldest to newest', () => {
    expect(DEFAULT_CATEGORIES.slice(0, 4).map((c) => c.id)).toEqual([
      'work',
      'study',
      'exercise',
      'entertainment',
    ]);
  });

  it('adds the five ADR-008 habit categories, oldest to newest after the originals', () => {
    expect(DEFAULT_CATEGORIES.slice(4).map((c) => c.id)).toEqual([
      'sleep',
      'school',
      'extra-class',
      'self-study',
      'meals',
    ]);
  });

  it('gives each habit category the icon and colour from ADR-008 §2.3', () => {
    const byId = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c]));
    expect(byId.sleep).toMatchObject({ name: 'Sleep', icon: '😴', color: '#7c3aed' });
    expect(byId.school).toMatchObject({ name: 'School', icon: '🏫', color: '#0284c7' });
    expect(byId['extra-class']).toMatchObject({
      name: 'Extra class',
      icon: '📝',
      color: '#ea580c',
    });
    expect(byId['self-study']).toMatchObject({ name: 'Self-study', icon: '📖', color: '#0d9488' });
    expect(byId.meals).toMatchObject({ name: 'Meals', icon: '🍚', color: '#65a30d' });
  });

  it('every entry is marked isDefault and has a strictly increasing createdAt', () => {
    expect(DEFAULT_CATEGORIES.every((c) => c.isDefault)).toBe(true);
    const created = DEFAULT_CATEGORIES.map((c) => c.createdAt);
    expect(created).toEqual([...created].sort((a, b) => a - b));
    expect(new Set(created).size).toBe(created.length);
  });
});
