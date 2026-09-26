export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <span aria-hidden className="text-3xl">
        ◌
      </span>
      <h2 className="text-lg font-semibold tracking-tight">No activities yet today</h2>
      <p className="max-w-xs text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        Add your first activity to start today&apos;s timeline. Everything stays on this device — no
        account, no sync.
      </p>
    </div>
  );
}
