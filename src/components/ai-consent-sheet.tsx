'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';

interface AiConsentSheetProps {
  open: boolean;
  onTurnOn: () => void;
  onNotNow: () => void;
}

/**
 * ADR-009 §1.2 ⑦ "Get AI comments on your days?" — shown before the first AI
 * call, opened from "Comments on your week"'s "Turn on" link (⑥) or the
 * account menu's "AI comments" item. Both buttons write the choice to the
 * profile (`setAiConsent`, called by the parent) — "Not now" still records
 * `granted: false` so a declined choice is remembered, not just dismissed.
 */
export function AiConsentSheet({ open, onTurnOn, onNotNow }: AiConsentSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const skipNextCloseRef = useRef(false);
  const titleId = useId();

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
    onNotNow();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onNotNow();
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a mouse-only affordance; keyboard users close via Escape, handled natively by <dialog>
    <dialog
      ref={ref}
      onClose={handleClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <span aria-hidden className="text-2xl">
        ✨
      </span>
      <h2 id={titleId} className="mt-3 text-xl font-semibold">
        Get AI comments on your days?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Once a day we send <strong>only numbers</strong> to Google Gemini to write a short comment:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <li>minutes per goal vs. your targets (last 7 days)</li>
        <li>% hiệu quả and your average day rating</li>
      </ul>
      <p className="mt-3 text-sm font-semibold">
        Never sent: your name, email, activity names or notes.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Google may use free-tier requests to improve its products. You can turn this off anytime in
        the account menu.{' '}
        <Link href="/privacy/" className="underline hover:no-underline">
          Privacy notice
        </Link>
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onTurnOn}
          className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100"
        >
          Turn on AI comments
        </button>
        <button
          type="button"
          onClick={onNotNow}
          className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:focus-visible:outline-zinc-100"
        >
          Not now — keep rule-based
        </button>
      </div>
    </dialog>
  );
}
