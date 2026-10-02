'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/**
 * Light/dark theme backed by the `dark` class on <html> (set before
 * hydration by theme-init-script.ts) and `localStorage.theme`. `mounted` is
 * false until the real theme is known, so icons don't flash.
 */
export function useTheme() {
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

  return { theme, mounted, toggle };
}
