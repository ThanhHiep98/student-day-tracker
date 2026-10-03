import { describe, expect, it } from 'vitest';
import {
  toActivity,
  toAiComment,
  toCategory,
  toDayRating,
  toDaySummary,
  toHabitGoals,
  toUserProfile,
} from './firestore-converters';
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

describe('toDayRating', () => {
  const stored = { score: 4 as const, updatedAt: 1_700_000_000_000 };

  it('keeps exactly the DayRating fields and drops unknown keys', () => {
    expect(toDayRating({ ...stored, date: '2026-10-03', extra: true })).toEqual(stored);
  });

  it('omits note when absent, keeps it when a string', () => {
    expect(toDayRating(stored)).not.toHaveProperty('note');
    expect(toDayRating({ ...stored, note: 'ổn' })).toEqual({ ...stored, note: 'ổn' });
  });
});

describe('toUserProfile', () => {
  const stored = {
    displayName: 'Minh Anh',
    email: 'minhanh@example.com',
    photoURL: null,
    createdAt: 1,
    privacyAcceptedAt: 1,
  };

  it('keeps exactly the UserProfile fields and drops unknown keys', () => {
    expect(toUserProfile({ ...stored, role: 'admin' })).toEqual(stored);
  });

  it('omits aiConsent when absent or malformed, keeps it when well-shaped', () => {
    expect(toUserProfile(stored)).not.toHaveProperty('aiConsent');
    expect(toUserProfile({ ...stored, aiConsent: { granted: 'yes' } })).not.toHaveProperty(
      'aiConsent'
    );
    expect(toUserProfile({ ...stored, aiConsent: { granted: true, at: 2 } })).toEqual({
      ...stored,
      aiConsent: { granted: true, at: 2 },
    });
  });
});

describe('toAiComment', () => {
  it('keeps exactly the AiComment fields and drops unknown keys', () => {
    const stored = {
      text: 'Solid week.',
      model: 'gemini-2.5-flash',
      inputHash: 'abc123',
      createdAt: 1,
    };
    expect(toAiComment({ ...stored, extra: true })).toEqual(stored);
  });
});

describe('toDaySummary', () => {
  const untrackedGoal = { actual: 0, target: null, score: null };
  const stored = {
    efficiency: 82,
    goals: {
      sleep: { actual: 370, target: 450, score: 0.82 },
      school: untrackedGoal,
      extraClass: untrackedGoal,
      selfStudy: untrackedGoal,
      meals: untrackedGoal,
      entertainment: untrackedGoal,
    },
    warnings: ['sleep-short'] as const,
    ratingScore: 4,
    updatedAt: 1_700_000_000_000,
  };

  it('keeps exactly the DaySummary fields and drops unknown top-level keys', () => {
    expect(toDaySummary({ ...stored, date: '2026-10-03', extra: true })).toEqual(stored);
  });

  it('round-trips a fully untracked day (efficiency and ratingScore null)', () => {
    const untracked = { ...stored, efficiency: null, ratingScore: null, warnings: [] };
    expect(toDaySummary(untracked)).toEqual(untracked);
  });
});
