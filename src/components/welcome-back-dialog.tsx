'use client';

import { goalCategoryId } from '@/lib/evaluate-day';
import type { UserScope } from '@/lib/firestore-paths';
import { formatMinutes } from '@/lib/get-daily-summary';
import type { DayEfficiency, GoalEfficiency } from '@/lib/get-efficiency';
import { fromIsoDate } from '@/lib/iso-date';
import type { Category, DayRating, HabitGoals, IsoDate } from '@/lib/types';
import { useEffect, useId, useRef, useState } from 'react';
import { DayRatingCard } from './day-rating-card';
import { EfficiencyRing } from './efficiency-ring';

interface WelcomeBackDialogProps {
  open: boolean;
  onClose: () => void;
  /** Yesterday, relative to `today`. */
  date: IsoDate;
  today: IsoDate;
  efficiency: DayEfficiency;
  /** The day before `date`'s percent, for the "Up/Down from X% the day before" line; `null` when unavailable. */
  dayBeforePercent: number | null;
  /** One rule-based sentence from `buildRuleComments`, or `null` with nothing to say. */
  comment: string | null;
  categories: Category[];
  habitGoals: HabitGoals;
  rating: DayRating | null | undefined;
  scope: UserScope | null;
}

function goalColor(categories: Category[], habitGoals: HabitGoals, goal: GoalEfficiency): string {
  const categoryId = goalCategoryId(habitGoals, goal.key);
  return categories.find((c) => c.id === categoryId)?.color ?? '#a1a1aa';
}

function goalValueText(goal: GoalEfficiency): string {
  if (goal.targetMinutes === null) return `${formatMinutes(goal.actualMinutes)} logged`;
  if (goal.isCap)
    return `${formatMinutes(goal.actualMinutes)} · cap ${formatMinutes(goal.targetMinutes)}`;
  return `${formatMinutes(goal.actualMinutes)} of ${formatMinutes(goal.targetMinutes)}`;
}

function GoalRow({ goal, color }: { goal: GoalEfficiency; color: string }) {
  const width = goal.score === null ? 0 : Math.round(Math.min(1, goal.score) * 100);
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span aria-hidden className="shrink-0">
        {goal.icon}
      </span>
      <span className="w-16 shrink-0 truncate sm:w-24">{goal.label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: goal.score === null ? 'transparent' : color,
          }}
        />
      </span>
      <span className="w-10 shrink-0 text-right font-semibold">
        {goal.score === null ? '–' : `${Math.round(goal.score * 100)}%`}
      </span>
      <span className="hidden w-36 shrink-0 text-right text-xs text-zinc-500 sm:block dark:text-zinc-400">
        {goalValueText(goal)}
      </span>
    </li>
  );
}

/**
 * ADR-009 §1.2 ④ "Welcome-back" — shown once per day on the first open
 * (`use-welcome-back-dialog.ts`'s D8 flag), for yesterday, only when
 * yesterday has activities. Native `<dialog>` for a free focus trap + Esc
 * (matches `ConfirmDialog`). The comment is slice 4's rule-based output —
 * there is no AI badge here (F3's Gemini comment is a later PR); "Rate
 * yesterday" reveals `DayRatingCard` for `date` inline instead of navigating
 * away.
 */
export function WelcomeBackDialog({
  open,
  onClose,
  date,
  today,
  efficiency,
  dayBeforePercent,
  comment,
  categories,
  habitGoals,
  rating,
  scope,
}: WelcomeBackDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const skipNextCloseRef = useRef(false);
  const titleId = useId();
  const [showRating, setShowRating] = useState(false);

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

  useEffect(() => {
    if (!open) setShowRating(false);
  }, [open]);

  function handleClose() {
    if (skipNextCloseRef.current) {
      skipNextCloseRef.current = false;
      return;
    }
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose();
  }

  const dateLabel = fromIsoDate(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const percent = efficiency.percent;
  const comparisonLine = (() => {
    if (percent === null || dayBeforePercent === null) return null;
    const diff = percent - dayBeforePercent;
    if (diff > 0) return `Up from ${dayBeforePercent}% the day before.`;
    if (diff < 0) return `Down from ${dayBeforePercent}% the day before.`;
    return `Same as the day before (${dayBeforePercent}%).`;
  })();

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a mouse-only affordance; keyboard users close via Escape, handled natively by <dialog>
    <dialog
      ref={ref}
      onClose={handleClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-start justify-between gap-3 p-6 pb-0">
        <p
          id={titleId}
          className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          Yesterday &middot; {dateLabel}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-m-1.5 rounded-full p-1.5 text-zinc-500 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:focus-visible:outline-zinc-100"
        >
          <span aria-hidden>&times;</span>
        </button>
      </div>

      <div className="flex flex-col gap-5 p-6 pt-4 sm:flex-row sm:items-start">
        <div className="mx-auto shrink-0 sm:mx-0">
          <EfficiencyRing
            percent={percent}
            srLabel={`${dateLabel}: ${percent !== null ? `${percent}% of your plan` : 'not tracked'}`}
            caption="of your plan"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            {percent !== null ? `You hit ${percent}% of your plan.` : 'Nothing tracked yesterday.'}
          </h2>
          {comparisonLine && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{comparisonLine}</p>
          )}

          <ul className="mt-4 divide-y divide-border">
            {efficiency.goals.map((goal) => (
              <GoalRow key={goal.key} goal={goal} color={goalColor(categories, habitGoals, goal)} />
            ))}
          </ul>
        </div>
      </div>

      {comment && (
        <div className="mx-6 mb-2 rounded-2xl border border-border bg-surface-muted p-4 text-sm leading-relaxed">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
            Rule-based
          </span>
          {comment}
        </div>
      )}

      {showRating && (
        <div className="mx-6 mb-2">
          <DayRatingCard date={date} today={today} rating={rating} scope={scope} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 p-6 pt-2">
        <button
          type="button"
          onClick={() => setShowRating((v) => !v)}
          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {showRating ? 'Hide rating' : 'Rate yesterday 🙂'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100"
        >
          Start today
        </button>
      </div>
    </dialog>
  );
}
