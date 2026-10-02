'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SidebarAccount } from './account-menu';
import { AppLogo } from './app-logo';

const TABS = [
  { href: '/', label: 'Home' },
  { href: '/history', label: 'History' },
  { href: '/insights', label: 'Insights' },
] as const;

const ICONS: Record<(typeof TABS)[number]['href'], ReactNode> = {
  '/': <path d="M3 10.5 10 4l7 6.5M5 9v7a1 1 0 0 0 1 1h3v-4.5h2V17h3a1 1 0 0 0 1-1V9" />,
  '/history': (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="1.5" />
      <path d="M3.5 8h13M7 3v3M13 3v3" />
    </>
  ),
  '/insights': <path d="M4 16V9M9.5 16V4M15 16v-6" />,
};

/**
 * Left sidebar navigation for wide viewports — the desktop counterpart to
 * NavBar's bottom tab bar (kept for narrow viewports). Same 3 sections from
 * the requirement doc's sitemap; matches the desktop mockup's left nav
 * column (req. 1, "1.1 + 1.2 bản đầy đủ"). The signed-in account block
 * (⑤ ⑥) is pinned to its bottom.
 */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface/60 px-3 py-6 sm:flex"
    >
      <div className="mb-6 flex items-center gap-2 px-2">
        <AppLogo />
        <span className="min-w-0 text-sm leading-tight font-semibold tracking-tight">
          Student Day Tracker
        </span>
      </div>

      {TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-surface-muted dark:text-zinc-400'
            }`}
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="size-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>{label}</title>
              {ICONS[href]}
            </svg>
            {label}
          </Link>
        );
      })}

      <SidebarAccount />
    </nav>
  );
}
