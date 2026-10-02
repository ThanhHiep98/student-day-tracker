import { describe, expect, it } from 'vitest';
import { buildActivity, buildUpdatedActivity } from './build-activity';
import { DEFAULT_CATEGORIES } from './default-categories';
import type { Activity, Category } from './types';

const categories: Category[] = [...DEFAULT_CATEGORIES];
const meta = { id: 'a1', createdAt: 1000 };
const valid = {
  name: 'Deep work',
  categoryId: 'work',
  date: '2026-09-28',
  startMinutes: 540,
  endMinutes: 630,
};

describe('buildActivity', () => {
  it('builds one same-day row from valid input, trimming the name', () => {
    expect(buildActivity({ ...valid, name: '  Deep work  ' }, categories, meta)).toEqual([
      {
        id: 'a1',
        createdAt: 1000,
        date: '2026-09-28',
        name: 'Deep work',
        categoryId: 'work',
        startMinutes: 540,
        endMinutes: 630,
      },
    ]);
  });

  it('does not set spanId on a same-day row', () => {
    const [row] = buildActivity(valid, categories, meta);
    expect(row).not.toHaveProperty('spanId');
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

  it('rejects a missing or invalid start date', () => {
    for (const date of ['', '2026-02-30', '28/09/2026']) {
      expect(() => buildActivity({ ...valid, date }, categories, meta)).toThrow(
        'Choose a valid date.'
      );
    }
  });

  it('rejects times outside 0-1439 or non-integers', () => {
    const bad = [
      { startMinutes: Number.NaN, endMinutes: 600 },
      { startMinutes: 540, endMinutes: Number.NaN },
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
    const [a] = buildActivity({ ...valid, startMinutes: 0, endMinutes: 1439 }, categories, meta);
    expect(a.endMinutes - a.startMinutes).toBe(1439);
  });

  it('rejects a start time equal to the end time', () => {
    expect(() =>
      buildActivity({ ...valid, startMinutes: 600, endMinutes: 600 }, categories, meta)
    ).toThrow("Start and end time can't be the same.");
    expect(() =>
      buildActivity({ ...valid, startMinutes: 0, endMinutes: 0 }, categories, meta)
    ).toThrow("Start and end time can't be the same.");
  });

  it('stores an end of 00:00 as a single row ending at midnight (1440)', () => {
    expect(
      buildActivity({ ...valid, startMinutes: 1260, endMinutes: 0 }, categories, meta)
    ).toEqual([
      {
        id: 'a1',
        createdAt: 1000,
        date: '2026-09-28',
        name: 'Deep work',
        categoryId: 'work',
        startMinutes: 1260,
        endMinutes: 1440,
      },
    ]);
  });

  it('splits 21:00 -> 01:00 into a head row on D and a tail row on D+1 sharing spanId', () => {
    const rows = buildActivity(
      { ...valid, name: 'Sleep', startMinutes: 1260, endMinutes: 60 },
      categories,
      meta
    );
    expect(rows).toEqual([
      {
        id: 'a1',
        spanId: 'a1',
        createdAt: 1000,
        date: '2026-09-28',
        name: 'Sleep',
        categoryId: 'work',
        startMinutes: 1260,
        endMinutes: 1440,
      },
      {
        id: 'a1-next',
        spanId: 'a1',
        createdAt: 1000,
        date: '2026-09-29',
        name: 'Sleep',
        categoryId: 'work',
        startMinutes: 0,
        endMinutes: 60,
      },
    ]);
  });

  it('rolls the tail over month and year boundaries', () => {
    const rows = buildActivity(
      { ...valid, date: '2026-12-31', startMinutes: 1380, endMinutes: 30 },
      categories,
      meta
    );
    expect(rows.map((r) => r.date)).toEqual(['2026-12-31', '2027-01-01']);
  });

  it('keeps a demo- id prefix on the tail row', () => {
    const rows = buildActivity({ ...valid, startMinutes: 1320, endMinutes: 60 }, categories, {
      id: 'demo-x',
      createdAt: 1,
    });
    expect(rows.map((r) => r.id)).toEqual(['demo-x', 'demo-x-next']);
  });
});

describe('buildUpdatedActivity', () => {
  const single: Activity = {
    id: 'demo-x',
    name: 'Deep work',
    categoryId: 'work',
    date: '2026-09-28',
    startMinutes: 540,
    endMinutes: 630,
    createdAt: 1000,
  };
  const head: Activity = {
    id: 's1',
    spanId: 's1',
    name: 'Sleep',
    categoryId: 'work',
    date: '2026-09-28',
    startMinutes: 1260,
    endMinutes: 1440,
    createdAt: 500,
  };
  const tail: Activity = {
    ...head,
    id: 's1-next',
    date: '2026-09-29',
    startMinutes: 0,
    endMinutes: 60,
  };

  it('replaces editable fields and keeps id and createdAt', () => {
    expect(
      buildUpdatedActivity(
        [single],
        {
          name: ' Read ',
          categoryId: 'study',
          date: '2026-09-28',
          startMinutes: 60,
          endMinutes: 120,
        },
        categories
      )
    ).toEqual({
      put: [
        {
          id: 'demo-x',
          date: '2026-09-28',
          createdAt: 1000,
          name: 'Read',
          categoryId: 'study',
          startMinutes: 60,
          endMinutes: 120,
        },
      ],
      deleteIds: [],
    });
  });

  it('can move a same-day activity to another date', () => {
    const { put } = buildUpdatedActivity([single], { ...valid, date: '2026-09-27' }, categories);
    expect(put).toEqual([{ ...single, date: '2026-09-27' }]);
  });

  it('turns a same-day activity into a span', () => {
    expect(
      buildUpdatedActivity([single], { ...valid, startMinutes: 1320, endMinutes: 90 }, categories)
    ).toEqual({
      put: [
        { ...single, spanId: 'demo-x', startMinutes: 1320, endMinutes: 1440 },
        {
          ...single,
          id: 'demo-x-next',
          spanId: 'demo-x',
          date: '2026-09-29',
          startMinutes: 0,
          endMinutes: 90,
        },
      ],
      deleteIds: [],
    });
  });

  it('turns a span back into a same-day activity and deletes the old tail', () => {
    const result = buildUpdatedActivity(
      [tail, head],
      {
        name: 'Sleep',
        categoryId: 'work',
        date: '2026-09-28',
        startMinutes: 1260,
        endMinutes: 1380,
      },
      categories
    );
    expect(result).toEqual({
      put: [
        {
          id: 's1',
          name: 'Sleep',
          categoryId: 'work',
          date: '2026-09-28',
          startMinutes: 1260,
          endMinutes: 1380,
          createdAt: 500,
        },
      ],
      deleteIds: ['s1-next'],
    });
    expect(result.put[0]).not.toHaveProperty('spanId');
  });

  it('rewrites both rows of a span (head id kept) when the span is edited', () => {
    const result = buildUpdatedActivity(
      [head, tail],
      {
        name: 'Night',
        categoryId: 'study',
        date: '2026-09-28',
        startMinutes: 1200,
        endMinutes: 120,
      },
      categories
    );
    expect(result).toEqual({
      put: [
        { ...head, name: 'Night', categoryId: 'study', startMinutes: 1200 },
        { ...tail, name: 'Night', categoryId: 'study', endMinutes: 120 },
      ],
      deleteIds: [],
    });
  });

  it('rejects an empty row list', () => {
    expect(() => buildUpdatedActivity([], valid, categories)).toThrow();
  });

  it('validates with the same rules as buildActivity', () => {
    expect(() => buildUpdatedActivity([single], { ...valid, name: '' }, categories)).toThrow(
      'Name is required.'
    );
    expect(() =>
      buildUpdatedActivity([single], { ...valid, startMinutes: 60, endMinutes: 60 }, categories)
    ).toThrow("Start and end time can't be the same.");
  });
});
