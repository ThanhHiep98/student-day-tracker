import type { AiComment } from './types';

/** Longest stored comment text; firestore.rules enforces the same limit.
 * Generous relative to the ~80-word prompt instruction (D5) — a defensive
 * cap against a misbehaving model response, not the real length target. */
export const AI_COMMENT_TEXT_MAX = 2000;

/**
 * Assemble a `users/{uid}/aiComments/{date}` document from a Gemini response
 * (ADR-009 §2.3 F3). Pure — `now`/`model`/`inputHash` are passed in. Throws on
 * an empty or oversized response so the caller falls back to rule-based
 * comments instead of caching garbage (D-fallback: "empty text" is a failure
 * like any other).
 */
export function buildAiComment(
  text: string,
  model: string,
  inputHash: string,
  now: number
): AiComment {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty AI response.');
  if (trimmed.length > AI_COMMENT_TEXT_MAX) {
    throw new Error(`AI response longer than ${AI_COMMENT_TEXT_MAX} characters.`);
  }
  return { text: trimmed, model, inputHash, createdAt: now };
}
