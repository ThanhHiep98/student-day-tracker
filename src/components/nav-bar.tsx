'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home' },
  { href: '/history', label: 'History' },
  { href: '/insights', label: 'Insights' },
] as const;

/**
 * Bottom tab bar for the three top-level sections from the requirement doc
 * (Home / History / Insights). Fixed to the viewport bottom on small screens,
 * matching the mobile-first layout implied by the mockups.
 */
export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80"
    >
      <ul className="mx-auto flex w-full max-w-2xl">
        {TABS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-2 py-3 text-xs font-medium transition-colors motion-reduce:transition-none ${
                  active
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
