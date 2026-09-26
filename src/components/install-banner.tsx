'use client';

interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

/**
 * Offers to install the PWA. Rendered only when the browser has signalled the
 * app is installable (see useInstallPrompt).
 */
export function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-surface px-4 py-3 text-sm shadow-sm shadow-zinc-900/[0.04] dark:border-zinc-800 dark:shadow-none">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm shadow-emerald-600/30"
        >
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Install</title>
            <path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13h10" />
          </svg>
        </span>
        <p>
          <span className="font-medium">Install Student Day Tracker</span>
          <span className="text-zinc-500 dark:text-zinc-400"> for one-tap, offline access.</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onInstall}
          className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors motion-reduce:transition-none hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100"
        >
          Install
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss install prompt"
          className="flex size-7 items-center justify-center rounded-full text-zinc-400 transition-colors motion-reduce:transition-none hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 dark:focus-visible:outline-zinc-100"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <title>Dismiss</title>
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
