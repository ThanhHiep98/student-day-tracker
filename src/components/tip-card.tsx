/** Static supporting card for Home's right rail — matches the mockup's tip card. */
export function TipCard() {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <p aria-hidden className="text-2xl">
        🌱
      </p>
      <p className="mt-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
        Every moment counts
      </p>
      <p className="mt-1 text-xs leading-relaxed text-emerald-900/70 dark:text-emerald-200/70">
        Log activities as you go — the more you track, the clearer the picture of where your time
        actually goes.
      </p>
    </div>
  );
}
