import { describe, expect, it } from 'vitest';
import { buildInsightCards } from './build-insight-cards';
import { DEFAULT_CATEGORIES } from './default-categories';
import type { Activity, Category } from './types';

const categories: Category[] = [...DEFAULT_CATEGORIES];
// Thursday — 4 elapsed days (Mon..Thu) in the week starting Mon 2026-09-28.
const range = { weekStart: '2026-09-28', today: '2026-10-01' };

let seq = 0;
const act = (date: string, categoryId: string, start: number, end: number): Activity => ({
  id: `a${seq++}`,
  name: categoryId,
  categoryId,
  date,
  startMinutes: start,
  endMinutes: end,
  createdAt: 0,
});

const card = (activities: Activity[], id: string) =>
  buildInsightCards(activities, categories, range).find((c) => c.id === id);

describe('buildInsightCards', () => {
  it('returns no cards for an empty week', () => {
    expect(buildInsightCards([], categories, range)).toEqual([]);
  });

  it('ignores activities outside the week so far and in unknown categories', () => {
    const activities = [
      act('2026-09-27', 'work', 0, 600),
      act('2026-10-02', 'work', 0, 600),
      act('2026-09-29', 'ghost', 0, 600),
    ];
    expect(buildInsightCards(activities, categories, range)).toEqual([]);
  });

  describe('Your week', () => {
    it('names the top category by minutes once anything is tracked', () => {
      expect(card([act('2026-09-28', 'work', 540, 630)], 'week')).toEqual({
        id: 'week',
        title: 'Your week',
        body: 'Most of your tracked time went to Work — 1h 30m this week.',
      });
    });

    it('breaks a tie by category createdAt order', () => {
      const activities = [act('2026-09-28', 'exercise', 0, 60), act('2026-09-28', 'study', 0, 60)];
      expect(card(activities, 'week')?.body).toContain('went to Study');
    });
  });

  describe('Your routine', () => {
    const studyAt = (date: string) => act(date, 'study', 9 * 60 + 30, 11 * 60);

    it('is omitted below 3 sessions in the same category + 3-hour bucket', () => {
      expect(card([studyAt('2026-09-28'), studyAt('2026-09-29')], 'routine')).toBeUndefined();
    });

    it('appears at 3 sessions', () => {
      const activities = [studyAt('2026-09-28'), studyAt('2026-09-29'), studyAt('2026-09-30')];
      expect(card(activities, 'routine')).toEqual({
        id: 'routine',
        title: 'Your routine',
        body: 'You usually do Study around 09:00–12:00 — 3 sessions this week.',
      });
    });

    it('breaks a tie by category order, then the earlier bucket', () => {
      const activities = [
        ...['2026-09-28', '2026-09-29', '2026-09-30'].map((d) => act(d, 'study', 900, 960)),
        ...['2026-09-28', '2026-09-29', '2026-09-30'].map((d) => act(d, 'work', 1000, 1060)),
        ...['2026-09-28', '2026-09-29', '2026-09-30'].map((d) => act(d, 'work', 600, 660)),
      ];
      expect(card(activities, 'routine')?.body).toBe(
        'You usually do Work around 09:00–12:00 — 3 sessions this week.'
      );
    });
  });

  describe('Your routine with cross-midnight spans', () => {
    const sleep = (id: string, d1: string, d2: string): Activity[] => [
      { ...act(d1, 'exercise', 1320, 1440), id, spanId: id },
      { ...act(d2, 'exercise', 0, 60), id: `${id}-next`, spanId: id },
    ];

    it('does not invent a 00:00 routine from span tails', () => {
      const activities = [
        ...sleep('s1', '2026-09-28', '2026-09-29'),
        ...sleep('s2', '2026-09-29', '2026-09-30'),
        ...sleep('s3', '2026-09-30', '2026-10-01'),
      ];
      expect(card(activities, 'routine')?.body).toBe(
        'You usually do Exercise around 21:00–24:00 — 3 sessions this week.'
      );
    });

    it('counts each span once', () => {
      const activities = [
        ...sleep('s1', '2026-09-28', '2026-09-29'),
        ...sleep('s2', '2026-09-29', '2026-09-30'),
      ];
      expect(card(activities, 'routine')).toBeUndefined();
    });
  });

  describe('Your pattern', () => {
    it('is omitted with only 1 tracked day', () => {
      expect(card([act('2026-09-29', 'work', 0, 120)], 'pattern')).toBeUndefined();
    });

    it('names the longest tracked day once 2 days are tracked', () => {
      const activities = [act('2026-09-28', 'work', 0, 60), act('2026-09-29', 'work', 0, 120)];
      expect(card(activities, 'pattern')).toEqual({
        id: 'pattern',
        title: 'Your pattern',
        body: 'Tuesday was your longest tracked day this week — 2h.',
      });
    });

    it('breaks a tie by the earlier day', () => {
      const activities = [act('2026-09-30', 'work', 0, 60), act('2026-09-28', 'work', 0, 60)];
      expect(card(activities, 'pattern')?.body).toMatch(/^Monday/);
    });
  });

  describe('Consistency', () => {
    it('is omitted when no category is tracked on 3 distinct days', () => {
      const activities = [
        act('2026-09-28', 'exercise', 0, 30),
        act('2026-09-29', 'exercise', 0, 30),
        act('2026-09-29', 'exercise', 100, 130),
      ];
      expect(card(activities, 'consistency')).toBeUndefined();
    });

    it('appears at 3 distinct days with the average over those days', () => {
      const activities = [
        act('2026-09-28', 'exercise', 0, 30),
        act('2026-09-29', 'exercise', 0, 30),
        act('2026-09-29', 'exercise', 100, 130),
        act('2026-10-01', 'exercise', 0, 30),
      ];
      expect(card(activities, 'consistency')).toEqual({
        id: 'consistency',
        title: 'Consistency',
        body: 'You tracked Exercise on 3 of 4 days this week — 40m on those days.',
      });
    });
  });

  it('orders cards week, routine, pattern, consistency', () => {
    const activities = ['2026-09-28', '2026-09-29', '2026-09-30'].map((d) =>
      act(d, 'study', 600, 660)
    );
    expect(buildInsightCards(activities, categories, range).map((c) => c.id)).toEqual([
      'week',
      'routine',
      'pattern',
      'consistency',
    ]);
  });
});
