import type { InsightCard } from '@/lib/build-insight-cards';

interface InsightCardsProps {
  cards: InsightCard[];
}

/**
 * Req. 3.3 "Insight cards" — short, specific observations computed by
 * buildInsightCards (rules + thresholds in plan §2.2 D1). When no rule
 * passes its threshold, an "unlock" note replaces the grid.
 */
export function InsightCards({ cards }: InsightCardsProps) {
  return (
    <section
      aria-labelledby="insight-cards-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="insight-cards-heading" className="text-sm font-semibold">
        Insight cards
      </h2>
      {cards.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Track a few more days to unlock insights.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <div key={card.id} className="rounded-xl bg-surface-muted p-3.5">
              <p className="text-xs font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
                {card.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
