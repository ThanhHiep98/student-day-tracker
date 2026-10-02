import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './default-categories';
import { countMigrationOps, planDexieMigration } from './plan-dexie-migration';
import type { Activity, Category } from './types';

const row = (id: string, overrides: Partial<Activity> = {}): Activity => ({
  id,
  categoryId: 'work',
  name: `Row ${id}`,
  date: '2026-10-01',
  startMinutes: 540,
  endMinutes: 600,
  createdAt: 1,
  ...overrides,
});

const singles = (n: number, prefix = 'a') =>
  Array.from({ length: n }, (_, i) => row(`${prefix}${i}`));

const pair = (id: string): Activity[] => [
  row(id, { spanId: id, date: '2026-09-30', startMinutes: 1260, endMinutes: 1440 }),
  row(`${id}-next`, { spanId: id, date: '2026-10-01', startMinutes: 0, endMinutes: 60 }),
];

const custom = (id: string, name: string, createdAt = 10): Category => ({
  id,
  name,
  color: '#0ea5e9',
  icon: '🏷️',
  isDefault: false,
  createdAt,
});

const defaults: Category[] = [...DEFAULT_CATEGORIES];
const noRemote = { activityIds: [] as string[], categories: [] as Category[] };

describe('planDexieMigration', () => {
  it('returns no batches when there is nothing local', () => {
    expect(planDexieMigration({ activities: [], categories: defaults }, noRemote)).toEqual([]);
  });

  it('puts exactly 500 ops in one batch and 501 in two', () => {
    const at500 = planDexieMigration({ activities: singles(500), categories: [] }, noRemote);
    expect(at500).toHaveLength(1);
    expect(countMigrationOps(at500)).toBe(500);

    const at501 = planDexieMigration({ activities: singles(501), categories: [] }, noRemote);
    expect(at501.map((b) => b.activities.length)).toEqual([500, 1]);
  });

  it('splits 600 local rows into 2 batches of at most 500 ops', () => {
    const batches = planDexieMigration({ activities: singles(600), categories: [] }, noRemote);
    expect(batches).toHaveLength(2);
    expect(batches.every((b) => b.categories.length + b.activities.length <= 500)).toBe(true);
    expect(countMigrationOps(batches)).toBe(600);
  });

  it('never splits a cross-midnight pair across the 500 boundary', () => {
    const activities = [...singles(499), ...pair('s1')];
    const batches = planDexieMigration({ activities, categories: [] }, noRemote);
    expect(batches.map((b) => b.activities.length)).toEqual([499, 2]);
    expect(batches[1].activities.map((a) => a.id)).toEqual(['s1', 's1-next']);
  });

  it('keeps a pair together even when its rows are far apart in the input', () => {
    const [head, tail] = pair('s1');
    const activities = [head, ...singles(498), tail];
    const batches = planDexieMigration({ activities, categories: [] }, noRemote);
    for (const batch of batches) {
      const ids = batch.activities.map((a) => a.id);
      expect(ids.includes('s1')).toBe(ids.includes('s1-next'));
    }
  });

  it('writes custom categories first, and skips defaults', () => {
    const categories = [...defaults, custom('c1', 'Volunteering'), custom('c2', 'Piano', 11)];
    const batches = planDexieMigration(
      { activities: [row('a1', { categoryId: 'c1' })], categories },
      noRemote
    );
    expect(batches).toHaveLength(1);
    expect(batches[0].categories.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(batches[0].activities.map((a) => a.id)).toEqual(['a1']);
  });

  it('counts categories toward the 500-op limit of the first batch', () => {
    const categories = [custom('c1', 'A'), custom('c2', 'B')];
    const batches = planDexieMigration({ activities: singles(499), categories }, noRemote);
    expect(batches.map((b) => b.categories.length + b.activities.length)).toEqual([500, 1]);
  });

  it('skips demo rows, including demo span tails', () => {
    const activities = [row('demo-1'), ...pair('demo-2'), row('real')];
    const batches = planDexieMigration({ activities, categories: [] }, noRemote);
    expect(batches.flatMap((b) => b.activities.map((a) => a.id))).toEqual(['real']);
  });

  it('skips activities and categories whose ids already exist remotely', () => {
    const batches = planDexieMigration(
      { activities: [row('a1'), row('a2')], categories: [custom('c1', 'Volunteering')] },
      { activityIds: ['a1'], categories: [custom('c1', 'Volunteering')] }
    );
    expect(batches).toEqual([{ categories: [], activities: [row('a2')] }]);
  });

  it('remaps a local custom category to a remote one with the same name (case-insensitive)', () => {
    const batches = planDexieMigration(
      {
        activities: [row('a1', { categoryId: 'local-gym' })],
        categories: [custom('local-gym', 'Gym ')],
      },
      { activityIds: [], categories: [custom('remote-gym', 'gym')] }
    );
    expect(batches).toEqual([
      { categories: [], activities: [row('a1', { categoryId: 'remote-gym' })] },
    ]);
  });

  it('remaps a local custom category named like a default to the default id', () => {
    const batches = planDexieMigration(
      {
        activities: [row('a1', { categoryId: 'mine' })],
        categories: [...defaults, custom('mine', 'STUDY')],
      },
      noRemote
    );
    expect(batches[0].categories).toEqual([]);
    expect(batches[0].activities[0].categoryId).toBe('study');
  });

  it('plans nothing when re-run after a successful migration', () => {
    const local = {
      activities: [...singles(10), ...pair('s1'), row('x', { categoryId: 'local-gym' })],
      categories: [...defaults, custom('c1', 'Piano'), custom('local-gym', 'Gym')],
    };
    const remoteCategories = [custom('remote-gym', 'gym')];
    const first = planDexieMigration(local, { activityIds: [], categories: remoteCategories });
    expect(countMigrationOps(first)).toBe(14);

    const after = {
      activityIds: first.flatMap((b) => b.activities.map((a) => a.id)),
      categories: [...remoteCategories, ...first.flatMap((b) => b.categories)],
    };
    expect(planDexieMigration(local, after)).toEqual([]);
  });

  it('drops unknown keys and caps over-long names to the rules limits', () => {
    const long = 'x'.repeat(250);
    const legacy = { ...row('a1', { name: long }), profileId: 'local' } as Activity;
    const batches = planDexieMigration(
      { activities: [legacy], categories: [custom('c1', long)] },
      noRemote
    );
    expect(batches[0].activities[0]).toEqual(row('a1', { name: 'x'.repeat(200) }));
    expect(batches[0].categories[0].name).toHaveLength(50);
  });

  it('skips malformed rows the Security Rules would reject', () => {
    const activities = [
      row('bad-date', { date: '2026-13-01' }),
      row('bad-range', { startMinutes: 600, endMinutes: 600 }),
      row('bad-end', { endMinutes: 1441 }),
      row('empty-name', { name: '   ' }),
      row('ok'),
    ];
    const batches = planDexieMigration({ activities, categories: [] }, noRemote);
    expect(batches.flatMap((b) => b.activities.map((a) => a.id))).toEqual(['ok']);
  });

  it('rejects a maxOps below 2 (a pair must fit in one batch)', () => {
    expect(() => planDexieMigration({ activities: [], categories: [] }, noRemote, 1)).toThrow();
  });
});
