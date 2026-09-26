'use client';

import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native <dialog> wrapper with accessible defaults: focus trap, Escape
 * closes, backdrop click cancels, focus returned to the trigger on close.
 *
 * The skipNextCloseRef avoids double-firing onCancel when the dialog is
 * closed programmatically (cancel/confirm buttons → state flips → effect
 * calls dialog.close() → would otherwise re-trigger onClose).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const skipNextCloseRef = useRef(false);
  const titleId = useId();
  const descId = useId();

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

  const confirmClass = destructive
    ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600 dark:bg-rose-500 dark:hover:bg-rose-400 dark:focus-visible:outline-rose-400'
    : 'bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100';

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a mouse-only affordance; keyboard users cancel via Escape, handled natively by <dialog>
    <dialog
      ref={ref}
      onClose={handleClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="m-auto w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <h2 id={titleId} className="text-base font-semibold">
        {title}
      </h2>
      {description && (
        <p id={descId} className="mt-2 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
          {description}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
