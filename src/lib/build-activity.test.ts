import { describe, expect, it } from 'vitest';
import { buildActivity, buildUpdatedActivity } from './build-activity';
import { DEFAULT_CATEGORIES } from './default-categories';
import type { Activity, Category } from './types';

const categories: Category[] = [...DEFAULT_CATEGORIES];
const meta = { id: 'a1', createdAt: 1000, date: '2026-09-28' };
const valid = { name: 'Deep work', categoryId: 'work', startMinutes: 540, endMinutes: 630 };

describe('buildActivity', () => {
  it('builds an activity from valid input, trimming the name', () => {
    expect(buildActivity({ ...valid, name: '  Deep work  ' }, categories, meta)).toEqual({
      id: 'a1',
      createdAt: 1000,
      date: '2026-09-28',
      name: 'Deep work',
      categoryId: 'work',
      startMinutes: 540,
      endMinutes: 630,
    });
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(() => buildActivity({ ...valid, name: '   ' }, categories, meta)).toThrow(
      'Name is required.'
    );
  });

  it('rejects a missing or unknown category', () => {
    expect(() => buildActivity({ ...valid, categoryId: '' }, categories, meta)).toThrow(
      'Choose a category.'
    );
    expect(() => buildActivity({ ...valid, categoryId: 'nope' }, categories, meta)).toThrow(
      'Choose a category.'
    );
  });

  it('rejects times outside 0-1439 or non-integers', () => {
    const bad = [
      { startMinutes: Number.NaN, endMinutes: 600 },
      { startMinutes: -1, endMinutes: 600 },
      { startMinutes: 540, endMinutes: 1440 },
      { startMinutes: 540.5, endMinutes: 600 },
    ];
    for (const times of bad) {
      expect(() => buildActivity({ ...valid, ...times }, categories, meta)).toThrow(
        'Enter a valid start and end time.'
      );
    }
  });

  it('accepts the full day boundaries 0 and 1439', () => {
    const a = buildActivity({ ...valid, startMinutes: 0, endMinutes: 1439 }, categories, meta);
    expect(a.endMinutes - a.startMinutes).toBe(1439);
  });

  it('rejects an end time equal to or before the start time', () => {
    expect(() =>
      buildActivity({ ...valid, startMinutes: 600, endMinutes: 600 }, categories, meta)
    ).toThrow('End time must be after start time.');
    expect(() =>
      buildActivity({ ...valid, startMinutes: 600, endMinutes: 540 }, categories, meta)
    ).toThrow('End time must be after start time.');
  });
});

describe('buildUpdatedActivity', () => {
  const existing: Activity = { ...valid, ...meta, id: 'demo-x' };

  it('replaces editable fields and keeps id, date and createdAt', () => {
    const updated = buildUpdatedActivity(
      existing,
      { name: ' Read ', categoryId: 'study', startMinutes: 60, endMinutes: 120 },
      categories
    );
    expect(updated).toEqual({
      id: 'demo-x',
      date: '2026-09-28',
      createdAt: 1000,
      name: 'Read',
      categoryId: 'study',
      startMinutes: 60,
      endMinutes: 120,
    });
  });

  it('validates with the same rules as buildActivity', () => {
    expect(() => buildUpdatedActivity(existing, { ...valid, name: '' }, categories)).toThrow(
      'Name is required.'
    );
  });
});
