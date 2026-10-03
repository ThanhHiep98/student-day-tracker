'use client';

import { DAY_RATING_NOTE_MAX, buildDayRating, isDayRatable } from '@/lib/build-day-rating';
import { saveDayRating } from '@/lib/day-rating-writes';
import type { UserScope } from '@/lib/firestore-paths';
import type { DayRating, IsoDate } from '@/lib/types';
import { useEffect, useId, useState } from 'react';

const EMOJI: Record<DayRating['score'], string> = {
  1: '😞',
  2: '🙁',
  3: '😐',
  4: '🙂',
  5: '😄',
};

const SCORES: DayRating['score'][] = [1, 2, 3, 4, 5];

interface DayRatingCardProps {
  date: IsoDate;
  today: IsoDate;
  /** `undefined` while loading, `null` when `date` has no rating yet. */
  rating: DayRating | null | undefined;
  scope: UserScope | null;
}

/**
 * "How was your day?" (ADR-009 §1.2 ①③, D1/D2): one tap on an emoji saves
 * the 1-5 score for `date` right away (keeping whatever note is drafted); an
 * optional note (≤ 280 chars, D1) needs an explicit Save. Editable for today
 * and the previous 7 days (D2) — read-only otherwise, showing just the saved
 * score and note, if any. Used on Home (`date` = today) and History (`date`
 * = the selected day).
 */
export function DayRatingCard({ date, today, rating, scope }: DayRatingCardProps) {
  const headingId = useId();
  const noteId = useId();
  const editable = isDayRatable(date, today);
  const [draftNote, setDraftNote] = useState(rating?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  // A different day's rating arrived (or the selected date changed, which
  // first reports `rating` as `undefined`/`null` again) — reset the draft to
  // match it, so switching days in History never leaks a note.
  useEffect(() => {
    setDraftNote(rating?.note ?? '');
    setError(null);
  }, [rating]);

  function save(score: DayRating['score'], note: string) {
    if (!scope) {
      setError('You are signed out. Sign in again to save your rating.');
      return;
    }
    try {
      const built = buildDayRating({ date, score, note }, { updatedAt: Date.now() }, today);
      saveDayRating(scope, date, built);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your rating.');
    }
  }

  function handleSaveNote() {
    if (rating) save(rating.score, draftNote);
  }

  const hasRating = rating != null;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-zinc-900/[0.04] dark:shadow-none"
    >
      <h2
        id={headingId}
        className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        How was your day?
      </h2>

      <div className="mt-3 flex items-center justify-between gap-2">
        {SCORES.map((score) => {
          const selected = rating?.score === score;
          return (
            <button
              key={score}
              type="button"
              aria-pressed={selected}
              aria-label={`${score} of 5`}
              disabled={!editable}
              onClick={() => save(score, draftNote)}
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl border text-xl transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-950/40'
                  : 'border-zinc-300 hover:bg-surface-muted dark:border-zinc-700'
              }`}
            >
              <span aria-hidden>{EMOJI[score]}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>Rough</span>
        <span>Great</span>
      </div>

      {hasRating && editable && (
        <div className="mt-4">
          <label htmlFor={noteId} className="sr-only">
            Optional note
          </label>
          <textarea
            id={noteId}
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value.slice(0, DAY_RATING_NOTE_MAX))}
            maxLength={DAY_RATING_NOTE_MAX}
            rows={3}
            placeholder="Add a note (optional)"
            className="w-full resize-none rounded-xl border border-zinc-300 bg-transparent p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:focus-visible:outline-zinc-100"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Optional note · {draftNote.length}/{DAY_RATING_NOTE_MAX}
            </span>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={draftNote === (rating.note ?? '')}
              className="shrink-0 rounded-full bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Save
            </button>
          </div>
        </div>
      )}
      {hasRating && !editable && rating.note && (
        <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">{rating.note}</p>
      )}
      {!hasRating && editable && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          One tap — add a note if you like.
        </p>
      )}
      {!hasRating && !editable && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Not rated.</p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}
