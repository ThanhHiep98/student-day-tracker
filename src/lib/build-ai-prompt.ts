import type { AiInput, AiInputGoal } from './build-ai-input';
import { formatMinutes } from './get-daily-summary';
import { fromIsoDate } from './iso-date';

/**
 * ADR-009 §2.2 D5/D9/D10 — the literal text sent to Gemini (Firebase AI
 * Logic). `build*Prompt` per CLAUDE.md's AI rule: pure, takes only an
 * `AiInput` (numbers + fixed goal labels), so there is no way for a name,
 * email, or free-text activity/category name to reach the model.
 */
export const AI_COMMENT_WORD_LIMIT = 80;

function weekdayLabel(date: string): string {
  return fromIsoDate(date).toLocaleDateString('en-US', { weekday: 'short' });
}

function dayPercentsLine(input: AiInput): string {
  return input.dayPercents
    .map((d) => `${weekdayLabel(d.date)} ${d.percent !== null ? `${d.percent}%` : '–'}`)
    .join(', ');
}

function goalLine(goal: AiInputGoal): string {
  if (goal.trackedDays === 0 || goal.averageActualMinutes === null) {
    return `${goal.label}: not tracked this week`;
  }
  if (goal.isCap) {
    if (goal.targetMinutes === null) {
      return `${goal.label}: avg ${formatMinutes(goal.averageActualMinutes)}, no cap set`;
    }
    return `${goal.label}: avg ${formatMinutes(goal.averageActualMinutes)}, cap ${formatMinutes(goal.targetMinutes)}, over cap on ${goal.overCount} of ${goal.trackedDays} days`;
  }
  return `${goal.label}: avg ${formatMinutes(goal.averageActualMinutes)} vs. ${formatMinutes(goal.targetMinutes ?? 0)} goal (${goal.percentOfTarget ?? 0}%)`;
}

/**
 * Builds the full prompt text for one weekly comment. Deterministic given
 * `input` — no clock reads, no randomness.
 */
export function buildAiPrompt(input: AiInput): string {
  const lines: string[] = [
    'You write short, neutral comments for a student day-tracking app about the student’s week versus their own plan.',
    `Rules: write in English, one paragraph, at most ${AI_COMMENT_WORD_LIMIT} words, neutral tone (never use the words "good" or "bad"), be specific with the numbers given, and offer at most one suggestion.`,
    'Data below is aggregated numbers only for the last 7 days (Mon-Sun) — there is no other information available.',
    `Daily % hiệu quả: ${dayPercentsLine(input)}`,
    `Week average: ${input.weekAveragePercent !== null ? `${input.weekAveragePercent}%` : 'not tracked'}`,
    ...input.goals.map(goalLine),
    `Average day rating: ${input.averageRating !== null ? `${input.averageRating}/5` : 'not rated'}`,
    `Bedtime offset vs. goal in minutes, positive = later (one value per tracked day): ${
      input.bedtimeOffsetMinutes.length > 0 ? input.bedtimeOffsetMinutes.join(', ') : 'no data'
    }`,
    'Write the comment now.',
  ];
  return lines.join('\n');
}
