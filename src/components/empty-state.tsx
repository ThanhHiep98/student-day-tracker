interface EmptyStateProps {
  title?: string;
  description?: string;
  /** Use `h3` when rendered inside a section that already has an `h2`. */
  headingLevel?: 'h2' | 'h3';
}

export function EmptyState({
  title = 'No activities yet today',
  description = "Add your first activity to start today's timeline. Everything stays on this device — no account, no sync.",
  headingLevel: Heading = 'h2',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <span aria-hidden className="text-3xl">
        ◌
      </span>
      <Heading className="text-lg font-semibold tracking-tight">{title}</Heading>
      <p className="max-w-xs text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}
