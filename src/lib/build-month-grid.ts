import { toIsoDate } from './iso-date';
import type { IsoDate } from './types';

export interface MonthGrid {
  /** Weeks of 7 cells (Mon..Sun). `null` pads days outside the month. */
  weeks: (IsoDate | null)[][];
  year: number;
  /** 0-11, matches `Date#getMonth`. */
  month: number;
}

/**
 * Build a Monday-start month grid for History's calendar view (req. 2):
 * "Mon Tue Wed Thu Fri Sat Sun" rows of the given month, padded with `null`
 * for the leading/trailing days that belong to adjacent months.
 *
 * Pure — no Dexie, no Date.now(). `month` is 0-indexed.
 */
export function buildMonthGrid(year: number, month: number): MonthGrid {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Date#getDay() is Sun=0..Sat=6; convert to Mon=0..Sun=6.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const cells: (IsoDate | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toIsoDate(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (IsoDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return { weeks, year, month };
}
