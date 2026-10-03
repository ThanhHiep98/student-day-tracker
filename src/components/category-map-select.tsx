'use client';

import type { Category } from '@/lib/types';
import { useId } from 'react';

interface CategoryMapSelectProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  /** Visible label, e.g. "Counts toward". */
  label?: string;
}

/**
 * "Counts toward ▾" (ADR-008 §1.2 ②–⑥⑨): every goal maps to a category, new
 * defaults pre-selected (D5) — any default or custom category is allowed, and
 * the same category can back two goals.
 */
export function CategoryMapSelect({
  categories,
  value,
  onChange,
  label = 'Counts toward',
}: CategoryMapSelectProps) {
  const id = useId();
  const current = categories.find((c) => c.id === value);
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: current?.color ?? '#a1a1aa' }}
      />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
