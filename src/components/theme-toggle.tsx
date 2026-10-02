'use client';

import { useTheme } from '@/lib/use-theme';

interface ThemeToggleProps {
  /** `icon`: moon/sun button (headers). `switch`: "Dark mode" row with a switch (mobile account sheet ⑧). */
  variant?: 'icon' | 'switch';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, mounted, toggle } = useTheme();
  const dark = theme === 'dark';

  if (variant === 'switch') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        onClick={toggle}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${className}`}
      >
        <span>Dark mode</span>
        <span
          aria-hidden
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors motion-reduce:transition-none ${
            dark ? 'border-indigo-500 bg-indigo-500' : 'border-border bg-surface-muted'
          }`}
        >
          <span
            className={`absolute top-0.5 size-5.5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
              dark ? 'translate-x-5.5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100 ${className}`}
    >
      {!mounted ? null : dark ? (
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>Sun</title>
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 2v2m0 12v2M2 10h2m12 0h2M4.2 4.2l1.4 1.4m8.8 8.8l1.4 1.4M4.2 15.8l1.4-1.4m8.8-8.8l1.4-1.4" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>Moon</title>
          <path d="M16.5 12.5A6.5 6.5 0 1 1 7.5 3.5a5.5 5.5 0 0 0 9 9z" />
        </svg>
      )}
    </button>
  );
}
