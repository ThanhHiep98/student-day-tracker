import type { ReactNode } from 'react';

/**
 * "Suggested for lớp 12" green hint shown on every question (ADR-008 §1.2,
 * D2: "đưa ra các gợi ý" from the requirement).
 */
export function SuggestionHint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
      <span aria-hidden>💡</span>
      <span>{children}</span>
    </p>
  );
}
