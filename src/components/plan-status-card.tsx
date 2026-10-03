'use client';

import type { DayEvaluation, GoalFinding, GoalStatus } from '@/lib/evaluate-day';
import { useState } from 'react';

const STATUS_ICON: Record<GoalStatus, string> = { ok: '✓', warn: '!', pending: '○' };

const STATUS_CIRCLE: Record<GoalStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  pending: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const STATUS_MESSAGE_CLASS: Record<GoalStatus, string> = {
  ok: 'text-zinc-500 dark:text-zinc-400',
  warn: 'text-amber-700 dark:text-amber-300 font-medium',
  pending: 'text-zinc-500 dark:text-zinc-400',
};

/** warn first, then pending, then ok — for the mobile "three most relevant rows" view. */
const RELEVANCE_RANK: Record<GoalStatus, number> = { warn: 0, pending: 1, ok: 2 };

const MOBILE_ROW_LIMIT = 3;

interface PlanStatusCardProps {
  evaluation: DayEvaluation;
}

function Row({ finding, hiddenOnMobile }: { finding: GoalFinding; hiddenOnMobile: boolean }) {
  return (
    <li
      className={`flex items-center justify-between gap-3 border-b border-border/70 py-2.5 last:border-b-0 ${hiddenOnMobile ? 'max-sm:hidden' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${STATUS_CIRCLE[finding.status]}`}
        >
          {STATUS_ICON[finding.status]}
        </span>
        <span aria-hidden className="shrink-0">
          {finding.icon}
        </span>
        <span className="truncate text-sm">{finding.actualText}</span>
      </div>
      <span className={`shrink-0 text-right text-sm ${STATUS_MESSAGE_CLASS[finding.status]}`}>
        {finding.message}
      </span>
    </li>
  );
}

/**
 * Home "Today vs your plan" (ADR-009 §1.2 ①②, D3-D5): one row per goal that
 * applies today, a status icon *and* text for each (never colour alone), and
 * at most one amber nudge line (the bedtime warning, D4) — no other row ever
 * carries a suggestion. Desktop shows every row; mobile shows the three most
 * relevant (any warning first) with a "Show all" toggle for the rest. One
 * list, ordered by relevance and CSS-truncated on mobile — never two copies
 * of the same rows, which would both answer the same `getByText` query.
 */
export function PlanStatusCard({ evaluation }: PlanStatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { findings, bedtime } = evaluation;

  const rows = [...findings].sort((a, b) => RELEVANCE_RANK[a.status] - RELEVANCE_RANK[b.status]);
  const hasMore = rows.length > MOBILE_ROW_LIMIT;

  return (
    <section
      aria-labelledby="plan-status-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-zinc-900/[0.04] dark:shadow-none"
    >
      <h2
        id="plan-status-heading"
        className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        Today vs your plan
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        So far today · targets from Habits &amp; goals
      </p>

      {findings.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No goals apply today — check Habits &amp; goals.
        </p>
      ) : (
        <>
          <ul className="mt-3">
            {rows.map((finding, i) => (
              <Row
                key={finding.key}
                finding={finding}
                hiddenOnMobile={!expanded && i >= MOBILE_ROW_LIMIT}
              />
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-sm font-medium text-indigo-600 hover:underline sm:hidden dark:text-indigo-400"
            >
              {expanded ? 'Show fewer' : 'Show all'}
            </button>
          )}
        </>
      )}

      {bedtime?.status === 'warn' && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <span aria-hidden>🌙</span>
          <p>{bedtime.message}</p>
        </div>
      )}
    </section>
  );
}
