import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { THEME_KEY, applyTheme, normalizeChoice, readChoice, resolveTheme, writeChoice } from './theme-core.js';

/**
 * Holds the theme choice for the React tree. theme-init.js has already put the
 * right class on <html> before the first paint; this keeps it in sync when the
 * person switches, when the system setting changes while "system" is chosen,
 * and when another tab of the dashboard switches.
 */

const ThemeContext = createContext(null);

const storage = () => {
  try { return window.localStorage; } catch { return null; }
};

const darkQuery = () => {
  try { return window.matchMedia?.('(prefers-color-scheme: dark)') ?? null; } catch { return null; }
};

export function ThemeProvider({ children }) {
  const [choice, setChoiceState] = useState(() => readChoice(storage()));
  const [systemDark, setSystemDark] = useState(() => Boolean(darkQuery()?.matches));

  useEffect(() => {
    const mq = darkQuery();
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === THEME_KEY) setChoiceState(normalizeChoice(e.newValue)); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const theme = resolveTheme(choice, systemDark);

  // Layout effect: the class changes before the browser paints the new state.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains('dark') === (theme === 'dark')) return;
    // No colour transitions for the moment of the switch, as the shop does it
    // (next-themes disableTransitionOnChange): every control would fade.
    root.setAttribute('data-theme-switching', '');
    applyTheme(root, theme);
    void root.offsetHeight;
    requestAnimationFrame(() => root.removeAttribute('data-theme-switching'));
  }, [theme]);

  const setChoice = useCallback((next) => {
    const c = normalizeChoice(next);
    writeChoice(storage(), c);
    setChoiceState(c);
  }, []);

  const value = useMemo(() => ({ choice, theme, setChoice }), [choice, theme, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() used outside <ThemeProvider>');
  return ctx;
}
