/**
 * Runs synchronously at the top of <body>, before React hydrates.
 * Reads the stored theme (or falls back to system preference) and sets
 * the `dark` class on <html> so the first paint matches — no flash.
 *
 * Inlined as a string because it has to run before any React code; the
 * shape stays tight so the cost is a few hundred bytes.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
