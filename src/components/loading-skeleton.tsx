/**
 * Placeholder shown while Dexie's live queries resolve on first paint.
 * Mirrors the rough shape of the loaded UI so the layout doesn't jump.
 */
export function LoadingSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-6 motion-safe:animate-pulse motion-reduce:opacity-60"
    >
      <div className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="space-y-2">
        <div className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
