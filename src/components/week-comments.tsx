interface WeekCommentsProps {
  comments: string[];
}

/**
 * Insights "Comments on your week" (ADR-009 §1.2 ⑥, rule-based state):
 * neutral, specific-numbers template sentences from `buildRuleComments`.
 * Always available, offline too — this slice ships only the rule-based
 * state; the "Rule-based"/"Gemini" label switch and the AI on/off footer
 * link are F3 (a later PR), not built here.
 */
export function WeekComments({ comments }: WeekCommentsProps) {
  return (
    <section
      aria-labelledby="week-comments-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="week-comments-heading"
          className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          Comments on your week
        </h2>
        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Rule-based
        </span>
      </div>

      {comments.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Track a few days this week to see comments here.
        </p>
      ) : (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {comments.map((comment) => (
            <li key={comment}>{comment}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
