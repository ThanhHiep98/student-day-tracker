'use client';

import { getInitial } from '@/lib/get-given-name';
import { type AuthUser, useAuth } from '@/lib/use-auth';
import { useSignOut } from '@/lib/use-sign-out';
import { type SyncStatus, useSyncStatus } from '@/lib/use-sync-status';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { ThemeToggle } from './theme-toggle';

/**
 * Account controls (plan §1.2 ⑤–⑧): the desktop sidebar block + popover
 * (`SidebarAccount`) and the mobile Home-header avatar + bottom sheet
 * (`MobileAccountButton`). Both show the initial, name, email and sync
 * status, link the privacy notice, and sign out via useSignOut (which asks
 * first when offline with unsynced changes).
 */

const SYNC_LABEL: Record<SyncStatus, string> = {
  synced: 'Synced · works offline',
  pending: 'Syncing changes…',
  offline: "Offline · changes sync when you're back online",
  error: "Some changes couldn't sync",
};

const SYNC_TONE: Record<SyncStatus, { dot: string; text: string }> = {
  synced: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  pending: { dot: 'bg-amber-500', text: 'text-amber-800 dark:text-amber-300' },
  offline: { dot: 'bg-zinc-400', text: 'text-zinc-600 dark:text-zinc-400' },
  error: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400' },
};

function SyncStatusLine({ className = '' }: { className?: string }) {
  const status = useSyncStatus();
  const tone = SYNC_TONE[status];
  return (
    <p className={`flex items-center gap-2 text-sm ${tone.text} ${className}`}>
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${tone.dot}`} />
      {SYNC_LABEL[status]}
    </p>
  );
}

function Avatar({ user, size }: { user: AuthUser; size: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 font-semibold text-white ${
        size === 'lg' ? 'size-11 text-lg' : 'size-9'
      }`}
    >
      {getInitial(user.displayName, user.email)}
    </span>
  );
}

function SignOutConfirm({ flow }: { flow: ReturnType<typeof useSignOut> }) {
  return (
    <ConfirmDialog
      open={flow.confirmOpen}
      title="Sign out while offline?"
      description="Some changes haven't synced and will be lost if you sign out now."
      confirmLabel="Sign out anyway"
      destructive
      onConfirm={flow.confirm}
      onCancel={flow.cancel}
    />
  );
}

const MENU_ITEM =
  'flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-900 motion-reduce:transition-none dark:focus-visible:outline-zinc-100';
const SIGN_OUT_ITEM =
  'text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40';

/** ⑤ ⑥ Account block pinned to the bottom of the desktop sidebar, with its popover. */
export function SidebarAccount() {
  const { user } = useAuth();
  const flow = useSignOut();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;
  const name = user.displayName || user.email || 'Account';

  return (
    <div ref={rootRef} className="relative mt-auto">
      {open && (
        // Non-modal: a disclosure popover (Esc / outside click close it), not a focus trap.
        <dialog
          open
          id={popoverId}
          aria-label="Account"
          className="absolute right-0 bottom-full left-0 m-0 mb-2 w-auto rounded-2xl border border-border bg-surface p-1.5 text-foreground shadow-lg"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            {user.email && (
              <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{user.email}</p>
            )}
          </div>
          <hr className="border-border" />
          <SyncStatusLine className="px-3 py-2.5" />
          <Link href="/goals/" onClick={() => setOpen(false)} className={MENU_ITEM}>
            Habits &amp; goals
          </Link>
          <Link href="/privacy/" onClick={() => setOpen(false)} className={MENU_ITEM}>
            Privacy notice
          </Link>
          <button
            type="button"
            onClick={() => void flow.requestSignOut()}
            disabled={flow.busy}
            className={`${MENU_ITEM} ${SIGN_OUT_ITEM}`}
          >
            {flow.busy ? 'Signing out…' : 'Sign out'}
          </button>
        </dialog>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 motion-reduce:transition-none dark:focus-visible:outline-zinc-100 ${
          open ? 'border-border bg-surface' : 'border-transparent'
        }`}
      >
        <Avatar user={user} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          {user.email && (
            <span className="block truncate text-xs text-zinc-600 dark:text-zinc-400">
              {user.email}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="size-4 shrink-0 text-zinc-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>Open account menu</title>
          <path d="m6.5 8 3.5-3.5L13.5 8M6.5 12l3.5 3.5 3.5-3.5" />
        </svg>
      </button>
      <SignOutConfirm flow={flow} />
    </div>
  );
}

/** ⑦ ⑧ Avatar button for the mobile Home header (below `sm`) and its bottom sheet. */
export function MobileAccountButton({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  const flow = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!user) return null;
  const name = user.displayName || user.email || 'Account';

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Account"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${className}`}
      >
        <Avatar user={user} size="lg" />
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a mouse-only affordance; keyboard users close via Escape, handled natively by <dialog> */}
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={handleBackdropClick}
        aria-labelledby={titleId}
        className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-3xl border-t border-border bg-surface px-6 pt-3 pb-8 text-foreground shadow-xl backdrop:bg-black/40"
      >
        <div aria-hidden className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-surface-muted" />
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-semibold">
              {name}
            </h2>
            {user.email && (
              <p className="truncate text-zinc-600 dark:text-zinc-400">{user.email}</p>
            )}
          </div>
        </div>
        <SyncStatusLine className="mt-4" />
        <hr className="my-4 border-border" />
        <ThemeToggle variant="switch" />
        <Link
          href="/goals/"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
        >
          Habits &amp; goals
        </Link>
        <Link
          href="/privacy/"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
        >
          Privacy notice
        </Link>
        <button
          type="button"
          onClick={() => void flow.requestSignOut()}
          disabled={flow.busy}
          className="flex min-h-11 w-full items-center rounded-lg px-1 text-left font-semibold text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 dark:text-rose-400 dark:focus-visible:outline-zinc-100"
        >
          {flow.busy ? 'Signing out…' : 'Sign out'}
        </button>
      </dialog>
      <SignOutConfirm flow={flow} />
    </>
  );
}
