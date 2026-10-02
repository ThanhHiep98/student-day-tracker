'use client';

import type { MigrationStart } from '@/lib/migrate-local-data';
import { useEffect, useId, useRef } from 'react';

export type MigrationDialogState =
  | { phase: 'idle' }
  | { phase: 'running'; start: MigrationStart; done: number; batch: number }
  | { phase: 'failed' };

interface MigrationDialogProps {
  state: MigrationDialogState;
  onClose: () => void;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * First sign-in on a device with local data ④ (plan §1.2): a modal over the
 * blurred app while migrate-local-data.ts copies Dexie rows into the account.
 * Native <dialog> + showModal() gives the focus trap; Escape is blocked while
 * the copy runs. Shown only when the migration has at least one write.
 */
export function MigrationDialog({ state, onClose }: MigrationDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const open = state.phase !== 'idle';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    // Escape: ignored while copying; closes the failure notice.
    e.preventDefault();
    if (state.phase === 'failed') onClose();
  }

  return (
    <dialog
      ref={ref}
      onCancel={handleCancel}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="m-auto w-[min(460px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-7 outline-none text-foreground shadow-xl backdrop:bg-white/40 backdrop:backdrop-blur-md dark:backdrop:bg-black/50"
    >
      <span aria-hidden className="text-3xl">
        📦
      </span>
      {state.phase === 'failed' ? (
        <>
          <h2 id={titleId} className="mt-4 text-lg font-semibold">
            Couldn&apos;t move your activities yet
          </h2>
          <p id={descId} className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Your activities are still saved on this device. We&apos;ll try again the next time you
            open the app.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100"
            >
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 id={titleId} className="mt-4 text-lg font-semibold">
            Moving your activities to your account
          </h2>
          <p id={descId} className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {state.phase === 'running'
              ? `We found ${plural(state.start.activities, 'activity', 'activities')}${
                  state.start.categories > 0
                    ? ` and ${plural(state.start.categories, 'custom category', 'custom categories')}`
                    : ''
                } saved on this device.`
              : null}{' '}
            This happens once — keep this tab open.
          </p>
          {state.phase === 'running' && (
            <>
              <progress
                value={state.done}
                max={state.start.total}
                aria-labelledby={titleId}
                className="mt-5 h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-indigo-600 [&::-webkit-progress-bar]:bg-surface-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-indigo-400 [&::-webkit-progress-value]:to-indigo-600"
              />
              <div className="mt-2 flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>
                  {state.done} of {state.start.total}
                </span>
                <span>
                  Batch {Math.min(state.batch + 1, state.start.batches)} of {state.start.batches}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </dialog>
  );
}
