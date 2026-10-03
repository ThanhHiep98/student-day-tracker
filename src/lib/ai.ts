import { GoogleAIBackend, getAI, getGenerativeModel } from 'firebase/ai';
import type { FirebaseApp } from 'firebase/app';
import { getFirebase } from './firebase';

/**
 * ADR-009 §2.2 D9/D11 F3 — the Gemini Developer API, reached through Firebase
 * AI Logic (never a raw API key in the bundle) and protected by App Check
 * (`firebase.ts`). One Flash-family model id, kept in this single constant so
 * bumping it later is a one-line change.
 */
export const AI_MODEL_ID = 'gemini-2.5-flash';

/** Injected so tests never call the real Gemini API (plan's testing strategy). */
export interface AiClient {
  generate(prompt: string): Promise<string>;
}

export function createGeminiClient(app: FirebaseApp): AiClient {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, { model: AI_MODEL_ID });
  return {
    async generate(prompt: string): Promise<string> {
      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  };
}

let override: AiClient | null = null;

/**
 * Emulator-only test seam (set by `firebase-test-hooks.ts`, which is itself
 * only loaded when `NEXT_PUBLIC_FIREBASE_EMULATORS === '1'` — never part of a
 * production bundle, so this can't be reached from `out/`).
 */
export function setAiClientOverride(client: AiClient | null): void {
  override = client;
}

/** The AI client to use — the mock override in tests, otherwise a fresh
 * Gemini client for the current app (cheap to construct; no network call
 * happens until `generate()`). */
export function getAiClient(): AiClient {
  if (override) return override;
  return createGeminiClient(getFirebase().app);
}
