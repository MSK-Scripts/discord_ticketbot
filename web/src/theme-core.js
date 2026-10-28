/**
 * Light, dark or system: the rules of the theme choice, without React or the
 * DOM, so tests/dashboard-theme.test.js can check them in Node.
 *
 * - A first visit follows the system setting (prefers-color-scheme).
 * - A choice is remembered per browser in localStorage under THEME_KEY,
 *   like the language (tb.lang). It is personal and needs no permission.
 * - Anything unreadable (private mode, blocked storage, an unknown value)
 *   counts as "system".
 *
 * theme-init.js applies the same rules before the first paint. It is a plain
 * script without imports, so the rules are written twice; the test runs both
 * against the same cases to keep them equal.
 */

export const THEME_KEY = 'tb.theme';
export const THEME_CHOICES = ['system', 'light', 'dark'];

export const normalizeChoice = (value) => (THEME_CHOICES.includes(value) ? value : 'system');

export function readChoice(storage) {
  try {
    return normalizeChoice(storage?.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export function writeChoice(storage, choice) {
  try {
    storage?.setItem(THEME_KEY, normalizeChoice(choice));
  } catch {
    /* private mode or blocked storage: the choice lasts for this page only */
  }
}

/** 'light' | 'dark' for a choice and the system's preference. */
export function resolveTheme(choice, systemDark) {
  const c = normalizeChoice(choice);
  if (c === 'system') return systemDark ? 'dark' : 'light';
  return c;
}

/** Put the resolved theme on <html>: the .dark class drives every token. */
export function applyTheme(root, theme) {
  root.classList.toggle('dark', theme === 'dark');
}
