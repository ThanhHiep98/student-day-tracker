'use client';

import type { UserScope } from '@/lib/firestore-paths';
import { migrateLocalData } from '@/lib/migrate-local-data';
import type { AuthUser } from '@/lib/use-auth';
import { useAuth } from '@/lib/use-auth';
import { ensureUserProfile } from '@/lib/user-profile';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { MigrationDialog, type MigrationDialogState } from './migration-dialog';
import { NavBar } from './nav-bar';
import { SidebarNav } from './sidebar-nav';
import { SignInScreen } from './sign-in-screen';

/** Uids whose first-run tasks already ran in this page session. */
const preparedUids = new Set<string>();

/**
 * Once per session after sign-in: create the profile if this is the account's
 * first sign-in, then run the one-time Dexie migration (dialog ④ only if there
 * is something to copy). Skipped offline — both need the server — and retried
 * on the next start.
 */
function FirstRunTasks({ user, scope }: { user: AuthUser; scope: UserScope }) {
  const [dialog, setDialog] = useState<MigrationDialogState>({ phase: 'idle' });

  useEffect(() => {
    if (preparedUids.has(scope.uid) || !navigator.onLine) return;
    preparedUids.add(scope.uid);
    let started = false;
    (async () => {
      await ensureUserProfile(scope, user);
      await migrateLocalData({
        scope,
        onStart: (start) => {
          started = true;
          setDialog({ phase: 'running', start, done: 0, batch: 0 });
        },
        onProgress: ({ done, batch }) =>
          setDialog((d) => (d.phase === 'running' ? { ...d, done, batch } : d)),
      });
      setDialog({ phase: 'idle' });
    })().catch((err: unknown) => {
      // Recoverable (e.g. the connection dropped): retried on the next start.
      console.warn('First-run setup failed; it will retry on the next start', err);
      if (started) setDialog({ phase: 'failed' });
    });
  }, [scope, user]);

  return <MigrationDialog state={dialog} onClose={() => setDialog({ phase: 'idle' })} />;
}

function FullPageSkeleton() {
  return (
    <main aria-busy="true" className="flex min-h-dvh flex-1">
      <span className="sr-only">Loading…</span>
      <div
        aria-hidden
        className="hidden w-64 shrink-0 border-r border-border bg-surface/60 sm:block"
      />
      <div
        aria-hidden
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 motion-safe:animate-pulse motion-reduce:opacity-60 sm:px-8"
      >
        <div className="h-9 w-64 rounded-lg bg-surface-muted" />
        <div className="h-28 rounded-2xl bg-surface-muted" />
        <div className="h-14 rounded-xl bg-surface-muted" />
        <div className="h-14 rounded-xl bg-surface-muted" />
      </div>
    </main>
  );
}

/**
 * Auth gate around the whole app (plan §1.3): a skeleton while Firebase
 * restores the session (a signed-in user never sees a flash of ①), the
 * sign-in screen for signed-out visitors on every route except /privacy/,
 * and the app shell once signed in.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, user, scope } = useAuth();
  const pathname = usePathname();

  if (status === 'loading') return <FullPageSkeleton />;
  if (status === 'signed-out') {
    return pathname.startsWith('/privacy') ? children : <SignInScreen />;
  }

  return (
    <div className="flex min-h-full">
      <SidebarNav />
      <div className="flex min-h-full flex-1 flex-col">
        {children}
        <NavBar />
      </div>
      <FirstRunTasks user={user} scope={scope} />
    </div>
  );
}
