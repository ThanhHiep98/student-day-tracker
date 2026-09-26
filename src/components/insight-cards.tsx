interface InsightCard {
  id: string;
  title: string;
  body: string;
}

interface InsightCardsProps {
  cards: InsightCard[];
}

/**
 * Req. 3.3 "Insight cards" — short, specific observations. The rule engine
 * behind these (thresholds, tie-breaks, minimum data) is an open question —
 * see plan Q&A — so cards are fixture content here, not computed.
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
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.id} className="rounded-xl bg-surface-muted p-3.5">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              {card.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
