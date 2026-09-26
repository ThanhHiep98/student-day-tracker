'use client';

import { formatMinutes } from '@/lib/get-daily-summary';
import type { Category } from '@/lib/types';
import { useEffect, useId, useRef, useState } from 'react';

export interface AddActivityFormValues {
  name: string;
  categoryId: string;
  startMinutes: number;
  endMinutes: number;
}

interface AddActivityFormProps {
  open: boolean;
  mode: 'add' | 'edit';
  categories: Category[];
  initialValues?: AddActivityFormValues;
  onSubmit: (values: AddActivityFormValues) => void;
  onCancel: () => void;
  /** Returns the created Category, or null if it couldn't be created. */
  onCreateCategory: (name: string) => Category | null;
}

function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function clockToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const DEFAULT_START = 9 * 60;
const DEFAULT_END = 10 * 60;

/**
 * Req. 1.3 "Add activity" (also handles Edit, req. 1.2, via `mode`). Submits
 * plain values — the caller decides how to persist them. Frontend phase
 * (plans/2026-09-26-add-activity.html §1.1): the caller only updates
 * session-local state, no Dexie write happens here or in the caller yet.
 *
 * <dialog> pattern mirrors confirm-dialog.tsx: focus trap via showModal(),
 * Escape closes natively, backdrop click cancels.
 */
export function AddActivityForm({
  open,
  mode,
  categories,
  initialValues,
  onSubmit,
  onCancel,
  onCreateCategory,
}: AddActivityFormProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const skipNextCloseRef = useRef(false);
  const titleId = useId();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startTime, setStartTime] = useState(minutesToClock(DEFAULT_START));
  const [endTime, setEndTime] = useState(minutesToClock(DEFAULT_END));
  const [error, setError] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      skipNextCloseRef.current = true;
      dialog.close();
    }
  }, [open]);

  // Reset the form fields whenever the dialog opens (or switches between
  // add/edit) — not on every `categories` change, which would happen on
  // every parent re-render and could stomp on in-progress typing.
  useEffect(() => {
    if (!open) return;
    setName(initialValues?.name ?? '');
    setCategoryId(initialValues?.categoryId ?? '');
    setStartTime(minutesToClock(initialValues?.startMinutes ?? DEFAULT_START));
    setEndTime(minutesToClock(initialValues?.endMinutes ?? DEFAULT_END));
    setError(null);
    setShowNewCategory(false);
    setNewCategoryName('');
    setCategoryError(null);
  }, [open, initialValues]);

  // Default to the first category once one is available, if none is set.
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categoryId, categories]);

  function handleClose() {
    if (skipNextCloseRef.current) {
      skipNextCloseRef.current = false;
      return;
    }
    onCancel();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onCancel();
  }

  function handleAddCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryError('Category name is required.');
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError('That category already exists.');
      return;
    }
    const created = onCreateCategory(trimmed);
    if (!created) {
      setCategoryError('Could not create category.');
      return;
    }
    setCategoryId(created.id);
    setNewCategoryName('');
    setShowNewCategory(false);
    setCategoryError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (!categoryId) {
      setError('Choose a category.');
      return;
    }
    const startMinutes = clockToMinutes(startTime);
    const endMinutes = clockToMinutes(endTime);
    if (startMinutes === null || endMinutes === null) {
      setError('Enter a valid start and end time.');
      return;
    }
    if (endMinutes <= startMinutes) {
      setError('End time must be after start time.');
      return;
    }
    setError(null);
    onSubmit({ name: trimmedName, categoryId, startMinutes, endMinutes });
  }

  const startMinutes = clockToMinutes(startTime);
  const endMinutes = clockToMinutes(endTime);
  const durationLabel =
    startMinutes !== null && endMinutes !== null && endMinutes > startMinutes
      ? formatMinutes(endMinutes - startMinutes)
      : '—';

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a mouse-only affordance; keyboard users cancel via Escape, handled natively by <dialog>
    <dialog
      ref={ref}
      onClose={handleClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      className="m-auto w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <h2 id={titleId} className="text-base font-semibold">
        {mode === 'edit' ? 'Edit activity' : 'Add activity'}
      </h2>

      <form className="mt-4 space-y-3.5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="activity-name"
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            What did you do?
          </label>
          <input
            id="activity-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Read, Gym, Design landing page"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div>
          <label
            htmlFor="activity-category"
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Category
          </label>
          <div className="flex gap-2">
            <select
              id="activity-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCategory((v) => !v)}
              aria-expanded={showNewCategory}
              className="shrink-0 rounded-lg border border-zinc-300 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              + New
            </button>
          </div>
          {showNewCategory && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                aria-label="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Add
              </button>
            </div>
          )}
          {categoryError && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{categoryError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="activity-start"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Start time
            </label>
            <input
              id="activity-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label
              htmlFor="activity-end"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              End time
            </label>
            <input
              id="activity-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Duration:{' '}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{durationLabel}</span>
        </p>

        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100"
          >
            {mode === 'edit' ? 'Save changes' : 'Save activity'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
