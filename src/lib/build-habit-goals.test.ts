import { describe, expect, it } from 'vitest';
import { type HabitGoalsFields, buildHabitGoals } from './build-habit-goals';
import { DEFAULT_CATEGORIES } from './default-categories';
import { suggestedHabitGoals } from './suggested-habit-goals';

const categories = [...DEFAULT_CATEGORIES];
const meta = { status: 'completed' as const, lastStep: 5 as const, createdAt: 1, updatedAt: 2 };

/**
 * All sections at their lowest valid value and no school blocks, so a single
 * field can be pushed to its own boundary without tripping the unrelated
 * "planned total ≤ 24h" rule.
 */
function baseFields(): HabitGoalsFields {
  return {
    sleep: { targetMinutes: 240, bedtimeMinutes: 23 * 60, categoryId: 'sleep' },
    school: { days: [1], blocks: [], categoryId: 'school' },
    extraClass: { targetMinutesPerDay: 0, categoryId: 'extra-class' },
    selfStudy: { targetMinutesPerDay: 0, categoryId: 'self-study' },
    meals: { targetMinutesPerDay: 15, categoryId: 'meals' },
    entertainment: { maxMinutesPerDay: 0, categoryId: 'entertainment' },
  };
}

describe('buildHabitGoals', () => {
  it('builds the full HabitGoals document from suggested fields', () => {
    const goals = buildHabitGoals(suggestedHabitGoals(), categories, meta);
    expect(goals).toMatchObject({
      version: 1,
      status: 'completed',
      lastStep: 5,
      createdAt: 1,
      updatedAt: 2,
    });
    expect(goals).not.toHaveProperty('completedAt');
  });

  it('includes completedAt only when meta provides it', () => {
    const goals = buildHabitGoals(suggestedHabitGoals(), categories, { ...meta, completedAt: 99 });
    expect(goals.completedAt).toBe(99);
  });

  describe('sleep (D6: 4-12h)', () => {
    it('accepts the boundaries', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals({ ...f, sleep: { ...f.sleep, targetMinutes: 240 } }, categories, meta)
      ).not.toThrow();
      expect(() =>
        buildHabitGoals({ ...f, sleep: { ...f.sleep, targetMinutes: 720 } }, categories, meta)
      ).not.toThrow();
    });
    it('rejects one minute outside the boundaries', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals({ ...f, sleep: { ...f.sleep, targetMinutes: 239 } }, categories, meta)
      ).toThrow('Sleep target must be between 4 and 12 hours.');
      expect(() =>
        buildHabitGoals({ ...f, sleep: { ...f.sleep, targetMinutes: 721 } }, categories, meta)
      ).toThrow('Sleep target must be between 4 and 12 hours.');
    });
  });

  describe('extraClass (D6: 0-8h)', () => {
    it('accepts the boundaries and rejects one minute outside', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          { ...f, extraClass: { ...f.extraClass, targetMinutesPerDay: 0 } },
          categories,
          meta
        )
      ).not.toThrow();
      expect(() =>
        buildHabitGoals(
          { ...f, extraClass: { ...f.extraClass, targetMinutesPerDay: 480 } },
          categories,
          meta
        )
      ).not.toThrow();
      expect(() =>
        buildHabitGoals(
          { ...f, extraClass: { ...f.extraClass, targetMinutesPerDay: -1 } },
          categories,
          meta
        )
      ).toThrow('Extra class must be between 0 and 8 hours a day.');
      expect(() =>
        buildHabitGoals(
          { ...f, extraClass: { ...f.extraClass, targetMinutesPerDay: 481 } },
          categories,
          meta
        )
      ).toThrow('Extra class must be between 0 and 8 hours a day.');
    });
  });

  describe('selfStudy (D6: 0-10h)', () => {
    it('accepts the boundaries and rejects one minute outside', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          { ...f, selfStudy: { ...f.selfStudy, targetMinutesPerDay: 600 } },
          categories,
          meta
        )
      ).not.toThrow();
      expect(() =>
        buildHabitGoals(
          { ...f, selfStudy: { ...f.selfStudy, targetMinutesPerDay: 601 } },
          categories,
          meta
        )
      ).toThrow('Self-study must be between 0 and 10 hours a day.');
    });
  });

  describe('meals (D6: 15m-4h)', () => {
    it('accepts the boundaries and rejects one minute outside', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals({ ...f, meals: { ...f.meals, targetMinutesPerDay: 15 } }, categories, meta)
      ).not.toThrow();
      expect(() =>
        buildHabitGoals({ ...f, meals: { ...f.meals, targetMinutesPerDay: 240 } }, categories, meta)
      ).not.toThrow();
      expect(() =>
        buildHabitGoals({ ...f, meals: { ...f.meals, targetMinutesPerDay: 14 } }, categories, meta)
      ).toThrow('Meals must be between 15 minutes and 4 hours a day.');
      expect(() =>
        buildHabitGoals({ ...f, meals: { ...f.meals, targetMinutesPerDay: 241 } }, categories, meta)
      ).toThrow('Meals must be between 15 minutes and 4 hours a day.');
    });
  });

  describe('entertainment (D6: 0-12h or no limit)', () => {
    it('accepts the boundaries and null (no limit)', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          { ...f, entertainment: { ...f.entertainment, maxMinutesPerDay: 0 } },
          categories,
          meta
        )
      ).not.toThrow();
      expect(() =>
        buildHabitGoals(
          { ...f, entertainment: { ...f.entertainment, maxMinutesPerDay: 720 } },
          categories,
          meta
        )
      ).not.toThrow();
      expect(() =>
        buildHabitGoals(
          { ...f, entertainment: { ...f.entertainment, maxMinutesPerDay: null } },
          categories,
          meta
        )
      ).not.toThrow();
    });
    it('rejects one minute outside the boundary', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          { ...f, entertainment: { ...f.entertainment, maxMinutesPerDay: 721 } },
          categories,
          meta
        )
      ).toThrow('Entertainment must be between 0 and 12 hours a day, or no limit.');
      expect(() =>
        buildHabitGoals(
          { ...f, entertainment: { ...f.entertainment, maxMinutesPerDay: -1 } },
          categories,
          meta
        )
      ).toThrow('Entertainment must be between 0 and 12 hours a day, or no limit.');
    });
  });

  describe('school blocks (D6: inside 05:00-22:00, end>start, non-overlapping, ≤2 blocks)', () => {
    it('accepts the window boundaries', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          { ...f, school: { ...f.school, blocks: [{ startMinutes: 300, endMinutes: 1320 }] } },
          categories,
          meta
        )
      ).not.toThrow();
    });

    it('rejects a block starting one minute before the window', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          { ...f, school: { ...f.school, blocks: [{ startMinutes: 299, endMinutes: 600 }] } },
          categories,
          meta
        )
      ).toThrow(/05:00 and 22:00/);
    });

    it('rejects a block ending one minute after the window', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          { ...f, school: { ...f.school, blocks: [{ startMinutes: 600, endMinutes: 1321 }] } },
          categories,
          meta
        )
      ).toThrow(/05:00 and 22:00/);
    });

    it('rejects end == start and end < start', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          { ...f, school: { ...f.school, blocks: [{ startMinutes: 600, endMinutes: 600 }] } },
          categories,
          meta
        )
      ).toThrow(/ending after they start/);
    });

    it('rejects overlapping blocks but allows touching ones', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          {
            ...f,
            school: {
              ...f.school,
              blocks: [
                { startMinutes: 420, endMinutes: 700 },
                { startMinutes: 690, endMinutes: 990 },
              ],
            },
          },
          categories,
          meta
        )
      ).toThrow("School blocks can't overlap.");
      expect(() =>
        buildHabitGoals(
          {
            ...f,
            school: {
              ...f.school,
              blocks: [
                { startMinutes: 420, endMinutes: 690 },
                { startMinutes: 690, endMinutes: 990 },
              ],
            },
          },
          categories,
          meta
        )
      ).not.toThrow();
    });

    it('rejects more than two blocks', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals(
          {
            ...f,
            school: {
              ...f.school,
              blocks: [
                { startMinutes: 300, endMinutes: 400 },
                { startMinutes: 400, endMinutes: 500 },
                { startMinutes: 500, endMinutes: 600 },
              ],
            },
          },
          categories,
          meta
        )
      ).toThrow('School time is at most 2 blocks a day.');
    });

    it('rejects a day outside 1-7 and a repeated day', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals({ ...f, school: { ...f.school, days: [0] } }, categories, meta)
      ).toThrow(/Monday \(1\) through Sunday \(7\)/);
      expect(() =>
        buildHabitGoals({ ...f, school: { ...f.school, days: [1, 1] } }, categories, meta)
      ).toThrow('Choose each school day once.');
    });
  });

  describe('category mapping', () => {
    it('rejects a categoryId that does not exist', () => {
      const f = baseFields();
      expect(() =>
        buildHabitGoals({ ...f, meals: { ...f.meals, categoryId: 'ghost' } }, categories, meta)
      ).toThrow('Choose a category for meals.');
    });

    it('accepts remapping a goal to any existing category, default or custom', () => {
      const f = baseFields();
      const custom = {
        id: 'c1',
        name: 'Volunteering',
        color: '#000000',
        icon: '🏷️',
        isDefault: false,
        createdAt: 1,
      };
      expect(() =>
        buildHabitGoals({ ...f, meals: { ...f.meals, categoryId: 'work' } }, categories, meta)
      ).not.toThrow();
      expect(() =>
        buildHabitGoals(
          { ...f, meals: { ...f.meals, categoryId: 'c1' } },
          [...categories, custom],
          meta
        )
      ).not.toThrow();
    });
  });

  describe('24h total (D6: planned total excl. entertainment ≤ 24h)', () => {
    it('allows the total at exactly 24h and rejects one minute more', () => {
      const f: HabitGoalsFields = {
        ...baseFields(),
        sleep: { ...baseFields().sleep, targetMinutes: 720 },
        extraClass: { ...baseFields().extraClass, targetMinutesPerDay: 480 },
        selfStudy: { ...baseFields().selfStudy, targetMinutesPerDay: 225 },
        meals: { ...baseFields().meals, targetMinutesPerDay: 15 },
      };
      // 720 + 480 + 225 + 15 = 1440, no school blocks.
      expect(() => buildHabitGoals(f, categories, meta)).not.toThrow();
      const over: HabitGoalsFields = {
        ...f,
        selfStudy: { ...f.selfStudy, targetMinutesPerDay: 226 },
      };
      expect(() => buildHabitGoals(over, categories, meta)).toThrow(
        'Your daily plan adds up to more than 24 hours. Lower a target.'
      );
    });
  });
});
