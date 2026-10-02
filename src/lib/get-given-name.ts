/**
 * Name for the Home greeting ("Good morning, Anh"), plan §2.2 Q5. Vietnamese
 * names put the given name last, so it's the last word of the Google display
 * name; without one, the email's local part; otherwise `null` (greeting
 * without a name).
 */
export function getGivenName(
  displayName: string | null | undefined,
  email: string | null | undefined
): string | null {
  const words = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) return words[words.length - 1];
  const localPart = (email ?? '').split('@')[0].trim();
  return localPart || null;
}

/** Avatar letter (⑤–⑧): first letter of the display name, else of the email, else `?`. */
export function getInitial(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const source = (displayName ?? '').trim() || (email ?? '').trim();
  return source ? source.charAt(0).toUpperCase() : '?';
}
