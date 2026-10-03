import type { WeeklyAiCommentState } from '@/lib/use-weekly-ai-comment';

interface WeekCommentsProps {
  /** Rule-based template sentences from `buildRuleComments` — the base layer
   * shown whenever AI is off, still loading, or unavailable. */
  comments: string[];
  ai: WeeklyAiCommentState;
  onTurnOnAi: () => void;
  onTurnOffAi: () => void;
}

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const FALLBACK_NOTICE: Record<'offline' | 'error', string> = {
  offline:
    "AI comment unavailable offline — showing rule-based comments. We'll try again when you're back online.",
  error:
    "AI comment unavailable right now — showing rule-based comments. We'll try again tomorrow.",
};

/**
 * Insights "Comments on your week" (ADR-009 §1.2 ⑥⑧⑨): rule-based template
 * sentences from `buildRuleComments` (always available, offline too), with a
 * label switch to Gemini's one-paragraph comment once F3's `aiComments/{date}`
 * is cached. `ai` (from `useWeeklyAiComment`) decides which state to render —
 * this component itself only renders, it never calls Gemini.
 */
export function WeekComments({ comments, ai, onTurnOnAi, onTurnOffAi }: WeekCommentsProps) {
  const showGemini = ai.status === 'ready';
  const fallbackReason = ai.status === 'fallback' ? ai.reason : null;

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
        {showGemini ? (
          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            ✨ Gemini
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Rule-based
          </span>
        )}
      </div>

      {fallbackReason && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface-muted p-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span aria-hidden>📡</span>
          {FALLBACK_NOTICE[fallbackReason]}
        </p>
      )}

      {showGemini && ai.status === 'ready' ? (
        <>
          <p className="mt-3 text-sm leading-relaxed">{ai.text}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Generated today {timeLabel(ai.createdAt)} from your weekly numbers only · may be
              inaccurate
            </span>
            <span>Next update tomorrow</span>
          </div>
        </>
      ) : comments.length === 0 ? (
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

      {!showGemini && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          {ai.status === 'off' ? (
            <>
              AI comments are off ·{' '}
              <button
                type="button"
                onClick={onTurnOnAi}
                className="font-medium text-indigo-600 underline hover:no-underline dark:text-indigo-400"
              >
                Turn on
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onTurnOffAi}
              className="font-medium text-indigo-600 underline hover:no-underline dark:text-indigo-400"
            >
              Turn off AI comments
            </button>
          )}
        </p>
      )}
    </section>
  );
}
