import { describe, expect, it } from 'vitest';
import { toActivity, toCategory, toHabitGoals } from './firestore-converters';
import { suggestedHabitGoals } from './suggested-habit-goals';

describe('toActivity', () => {
  const stored = {
    id: 'a1',
    categoryId: 'work',
    name: 'Deep work',
    date: '2026-10-01',
    startMinutes: 540,
    endMinutes: 600,
    createdAt: 42,
  };

  it('keeps exactly the Activity fields and drops unknown keys', () => {
    expect(toActivity({ ...stored, profileId: 'local', extra: true })).toEqual(stored);
  });

  it('omits spanId when absent or null, keeps it when set', () => {
    expect(toActivity(stored)).not.toHaveProperty('spanId');
    expect(toActivity({ ...stored, spanId: null })).not.toHaveProperty('spanId');
    expect(toActivity({ ...stored, spanId: undefined })).not.toHaveProperty('spanId');
    expect(toActivity({ ...stored, spanId: 'a1' })).toEqual({ ...stored, spanId: 'a1' });
  });
});

describe('toCategory', () => {
  it('keeps exactly the Category fields and drops unknown keys', () => {
    const category = {
      id: 'c1',
      name: 'Volunteering',
      color: '#0ea5e9',
      icon: '🏷️',
      isDefault: false,
      createdAt: 7,
    };
    expect(toCategory({ ...category, foo: 'bar' })).toEqual(category);
  });
});

describe('toHabitGoals', () => {
  const stored = {
    version: 1 as const,
    status: 'completed' as const,
    lastStep: 5 as const,
    ...suggestedHabitGoals(),
    createdAt: 1,
    updatedAt: 2,
  };

  it('keeps exactly the HabitGoals fields and drops unknown keys', () => {
    expect(toHabitGoals({ ...stored, extra: 'x' })).toEqual(stored);
  });

  it('omits completedAt when absent, keeps it when a number', () => {
    expect(toHabitGoals(stored)).not.toHaveProperty('completedAt');
    expect(toHabitGoals({ ...stored, completedAt: 3 })).toEqual({ ...stored, completedAt: 3 });
  });
});
