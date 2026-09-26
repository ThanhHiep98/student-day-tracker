'use client';

interface DemoBannerProps {
  onClear: () => void;
}

/**
 * Shown when the app is populated with first-run demo content. Lets the
 * visitor wipe it and start from a clean slate.
 */
export function DemoBanner({ onClear }: DemoBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-sm shadow-sm shadow-emerald-900/[0.03] dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:shadow-none">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        >
          <svg
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Demo</title>
            <path d="M8 5.5v3.5M8 11h.01" />
            <circle cx="8" cy="8" r="6.25" />
          </svg>
        </span>
        <p className="text-emerald-900 dark:text-emerald-100">
          <span className="font-medium">Demo data</span>
          <span className="text-emerald-700/80 dark:text-emerald-200/70">
            {' '}
            — explore freely, then clear it to start your own.
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-full border border-emerald-300/80 bg-white/60 px-3 py-1 text-xs font-medium text-emerald-800 transition-colors motion-reduce:transition-none hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100 dark:hover:bg-emerald-900/70"
      >
        Clear &amp; start fresh
      </button>
    </div>
  );
}
