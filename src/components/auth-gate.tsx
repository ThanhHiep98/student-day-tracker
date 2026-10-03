'use client';

import { DEFAULT_CATEGORIES } from '@/lib/default-categories';
import type { UserScope } from '@/lib/firestore-paths';
import { getGivenName } from '@/lib/get-given-name';
import { migrateLocalData } from '@/lib/migrate-local-data';
import type { AuthUser } from '@/lib/use-auth';
import { useAuth } from '@/lib/use-auth';
import { useCategories } from '@/lib/use-categories';
import { useHabitGoals } from '@/lib/use-habit-goals';
import {
  clearOnboardingWizardRequest,
  useOnboardingWizardRequest,
} from '@/lib/use-onboarding-wizard';
import { ensureUserProfile } from '@/lib/user-profile';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { DaySummaryWriter } from './day-summary-writer';
import { MigrationDialog, type MigrationDialogState } from './migration-dialog';
import { NavBar } from './nav-bar';
import { OnboardingWizard } from './onboarding-wizard';
import { SidebarNav } from './sidebar-nav';
import { SignInScreen } from './sign-in-screen';

/**
 * ADR-009 §2.2 D16 — "only while at least one parent is linked". Parent
 * linking is slice 8b; until then this stays `false` so `DaySummaryWriter`
 * makes no production writes (see `docs/ARCHITECTURE.md` "Status"). 8b
 * replaces this constant with `useParentLinks().length > 0`.
 */
const PARENT_SUMMARY_SHARING_ENABLED = false;

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
 * the onboarding wizard (ADR-008 §1.2 ①–⑦) in place of the whole app shell
 * while it needs to be shown, and the app shell otherwise.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, user, scope } = useAuth();
  const pathname = usePathname();
  const goals = useHabitGoals();
  const categories = useCategories();
  const requestedWizardStep = useOnboardingWizardRequest();
  // Sticky: once shown, stays open until `onDone` — the wizard's own first
  // save flips `goals` from null to an in-progress document, which must not
  // close the wizard out from under the student (only Skip/Save does, via
  // onDone below).
  const [wizardActive, setWizardActive] = useState(false);

  // A stale request/open wizard from a previous account must not leak into
  // the next sign-in.
  useEffect(() => {
    if (status !== 'signed-in') {
      clearOnboardingWizardRequest();
      setWizardActive(false);
    }
  }, [status]);

  // `goals === null` once loaded: this account never started the
  // questionnaire — show it right away (ADR-008 §2.4).
  useEffect(() => {
    if (goals === null) setWizardActive(true);
  }, [goals]);

  // Something asked for it (the Home banner's Continue, or Habits & goals'
  // Re-run questionnaire).
  useEffect(() => {
    if (requestedWizardStep !== null) setWizardActive(true);
  }, [requestedWizardStep]);

  if (status === 'loading') return <FullPageSkeleton />;
  if (status === 'signed-out') {
    return pathname.startsWith('/privacy') ? children : <SignInScreen />;
  }

  function handleWizardDone() {
    setWizardActive(false);
    clearOnboardingWizardRequest();
  }

  // FirstRunTasks stays mounted at the same tree position regardless of
  // `wizardActive` — rendering it from two different branches would remount
  // it when the gate flips mid-migration, orphaning the dialog's state.
  return (
    <>
      {wizardActive ? (
        <OnboardingWizard
          scope={scope}
          categories={categories ?? [...DEFAULT_CATEGORIES]}
          existing={goals ?? null}
          startStep={requestedWizardStep ?? 0}
          givenName={getGivenName(user.displayName, user.email)}
          onDone={handleWizardDone}
        />
      ) : (
        <div className="flex min-h-full">
          <SidebarNav />
          <div className="flex min-h-full flex-1 flex-col">
            {children}
            <NavBar />
          </div>
        </div>
      )}
      <FirstRunTasks user={user} scope={scope} />
      <DaySummaryWriter scope={scope} enabled={PARENT_SUMMARY_SHARING_ENABLED} />
    </>
  );
}
