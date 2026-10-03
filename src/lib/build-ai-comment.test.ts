import { describe, expect, it } from 'vitest';
import { AI_COMMENT_TEXT_MAX, buildAiComment } from './build-ai-comment';

describe('buildAiComment', () => {
  it('trims the text and assembles the stored shape', () => {
    expect(
      buildAiComment('  Solid week. \n', 'gemini-2.5-flash', 'abc123', 1_700_000_000_000)
    ).toEqual({
      text: 'Solid week.',
      model: 'gemini-2.5-flash',
      inputHash: 'abc123',
      createdAt: 1_700_000_000_000,
    });
  });

  it('throws on an empty or whitespace-only response', () => {
    expect(() => buildAiComment('', 'gemini-2.5-flash', 'abc123', 1)).toThrow();
    expect(() => buildAiComment('   ', 'gemini-2.5-flash', 'abc123', 1)).toThrow();
  });

  it('throws on a response longer than the cap', () => {
    expect(() =>
      buildAiComment('a'.repeat(AI_COMMENT_TEXT_MAX + 1), 'gemini-2.5-flash', 'abc123', 1)
    ).toThrow();
    expect(() =>
      buildAiComment('a'.repeat(AI_COMMENT_TEXT_MAX), 'gemini-2.5-flash', 'abc123', 1)
    ).not.toThrow();
  });
});
