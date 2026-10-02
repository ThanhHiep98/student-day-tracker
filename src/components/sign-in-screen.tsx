'use client';

import { authErrorCode, signInWithGoogle } from '@/lib/use-auth';
import { useOnlineStatus } from '@/lib/use-online-status';
import Link from 'next/link';
import { useState } from 'react';
import { AppLogo } from './app-logo';

const BENEFITS = [
  {
    icon: '🕒',
    title: 'Log in seconds',
    long: 'What you did, from when to when — including late nights past midnight.',
    short: 'Including late nights past midnight.',
  },
  {
    icon: '📊',
    title: 'Understand your week',
    long: 'Daily timeline, calendar history and calm, no-judgement insights.',
    short: 'Timeline, history and calm insights.',
  },
  {
    icon: '☁️',
    title: 'Synced & offline',
    long: 'Same data on phone and laptop; keeps working without a connection.',
    short: 'Same data on every device.',
  },
] as const;

/** The user closed the popup, or a second click superseded the first: not an error. */
const SILENT_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

function signInErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/network-request-failed':
      return "Couldn't reach Google. Check your connection and try again.";
    case 'auth/unauthorized-domain':
      return "Sign-in isn't enabled for this address yet.";
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

/** Google's "G" mark. Brand colors are part of the logo, not app styling. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="size-4.5 shrink-0">
      <title>Google</title>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/**
 * Sign-in screen ① (desktop) / ② (mobile) / ③ (offline) — plan §1.2. The only
 * screen a signed-out visitor sees. One Google button: the first sign-in
 * creates the account, so there is no separate sign-up.
 */
export function SignInScreen() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code = authErrorCode(err);
      if (!code || !SILENT_CODES.has(code)) setError(signInErrorMessage(code));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-12 px-4 py-10 sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-24">
      <section
        aria-labelledby="sign-in-heading"
        className="w-full rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10 lg:order-2 lg:max-w-md lg:justify-self-end"
      >
        <div className="flex items-center gap-3">
          <AppLogo size="lg" />
          <span className="font-semibold tracking-tight">Student Day Tracker</span>
        </div>
        <h1 id="sign-in-heading" className="mt-8 text-3xl font-semibold tracking-tight">
          Welcome
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Sign in to keep your days in sync on every device. Your first sign-in creates your
          account.
        </p>

        {!online && (
          <p className="mt-6 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <span aria-hidden>📡</span>
            <span>
              <strong className="font-semibold">You&apos;re offline.</strong> Connect to the
              internet to sign in the first time — after that the app works offline.
            </span>
          </p>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={!online || pending}
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-zinc-300 bg-surface px-5 py-2.5 font-medium text-zinc-900 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-zinc-500 motion-reduce:transition-none dark:border-zinc-700 dark:text-zinc-100 dark:focus-visible:outline-zinc-100 dark:disabled:text-zinc-400"
        >
          <span className={!online ? 'opacity-50' : undefined}>
            <GoogleMark />
          </span>
          {pending ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <p className="mt-5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          By continuing you agree to the{' '}
          <Link
            href="/privacy/"
            className="text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            privacy notice
          </Link>
          . Your data is stored in Singapore (Google Cloud) and is only visible to you.
        </p>
      </section>

      <section aria-labelledby="benefits-heading" className="lg:order-1">
        <p className="hidden text-sm font-semibold tracking-[0.12em] text-indigo-700 uppercase lg:block dark:text-indigo-300">
          For students preparing for university
        </p>
        <h2
          id="benefits-heading"
          className="sr-only text-4xl font-semibold tracking-tight lg:not-sr-only lg:mt-3 lg:block lg:text-5xl lg:leading-tight"
        >
          See where your day actually goes.
        </h2>
        <ul className="flex flex-col gap-6 px-2 lg:mt-8 lg:px-0">
          {BENEFITS.map(({ icon, title, long, short }) => (
            <li key={title} className="flex gap-4">
              <span aria-hidden className="text-2xl leading-none">
                {icon}
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  <span className="lg:hidden">{short}</span>
                  <span className="hidden lg:inline">{long}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
