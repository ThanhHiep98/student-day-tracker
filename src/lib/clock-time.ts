/**
 * `HH:MM` ⇄ minutes-since-midnight, shared by every `<input type="time">`
 * field (add-activity-form.tsx and the onboarding wizard's questions).
 */
export function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** `null` for anything that isn't a strict `HH:MM` string. */
export function clockToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
