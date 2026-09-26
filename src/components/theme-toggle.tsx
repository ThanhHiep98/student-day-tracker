'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100"
    >
      {!mounted ? null : theme === 'dark' ? (
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
