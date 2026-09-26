interface InsightSectionProps {
  id: string;
  title: string;
  hint: string;
}

/**
 * Insights — req. 3: turn raw totals into narrative ("Bạn đang dành thời
 * gian cho điều gì?", not just "Work = 20h"). Every subsection below is a
 * structural placeholder only — charts, comparisons, and analytics are
 * feature work for the Implement agent, driven by the plan the Plan agent
 * produces from requirement/Requirement.docx. See CLAUDE.md.
 */
function InsightSection({ id, title, hint }: InsightSectionProps) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-dashed border-border p-5">
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p>
    </section>
  );
}

export default function InsightsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Not just totals — what you&apos;re actually spending your time on.
        </p>
      </header>

      <InsightSection
        id="weekly-overview-heading"
        title="Weekly overview"
        hint="Chart of hours per category across the current week (req. 3.1)."
      />
      <InsightSection
        id="compare-heading"
        title="Compare"
        hint={
          'Framed as a delta, not good/bad — e.g. "You spent 2h35m more on Work this week" (req. 3.2).'
        }
      />
      <InsightSection
        id="insight-cards-heading"
        title="Insight cards"
        hint="Short, specific observations surfaced automatically (req. 3.3)."
      />
      <InsightSection
        id="monthly-overview-heading"
        title="Monthly overview"
        hint="Rolled-up totals for the current month (req. 3.3)."
      />
      <InsightSection
        id="activity-analytics-heading"
        title="Activity analytics"
        hint="Drill into a single activity's history and trend (req. 3.4)."
      />
    </main>
  );
}
