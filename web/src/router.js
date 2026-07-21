// Minimal client-side routing for the dashboard.
//
// The dashboard is a single-page app served at the site root. Without routing the
// current view lived only in React state, so an F5 (or a shared link) always
// dropped you back on the first page. This maps the URL path to a view so a
// reload and a deep link both land where you expect, and the address bar shows
// the real page (/permissions, /tickets/123, …).
//
// The server already serves index.html for any non-/api GET (the SPA fallback),
// so these paths resolve on a hard reload too. No dependency: the need here is a
// handful of top-level views plus one ":id" detail route.

import { useState, useEffect, useCallback } from 'react';

// Nav view id ⇄ URL segment. Kept explicit (not derived from the id) so the
// address bar can read "/permissions" while the code keeps the "access" id.
const VIEW_TO_SEGMENT = {
  mine: 'mine',
  tickets: 'tickets',
  stats: 'stats',
  config: 'config',
  bot: 'bot',
  access: 'permissions',
  settings: 'settings',
};
const SEGMENT_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_TO_SEGMENT).map(([view, seg]) => [seg, view]),
);

// Views whose second path segment is a ticket id (/tickets/:id, /mine/:id).
const DETAIL_VIEWS = new Set(['tickets', 'mine']);

/** pathname → { view, param }. Unknown paths give view:null (caller picks a default). */
export function parseRoute(pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  const view = SEGMENT_TO_VIEW[parts[0]] ?? null;
  const raw = view && DETAIL_VIEWS.has(view) ? parts[1] : undefined;
  // Ticket ids are integers; anything else is ignored so a junk path shows the
  // list rather than an error detail view.
  const param = raw && /^\d+$/.test(raw) ? raw : null;
  return { view, param };
}

/** { view, param } → pathname. Unknown view → "/". */
export function viewPath(view, param) {
  const seg = VIEW_TO_SEGMENT[view];
  if (!seg) return '/';
  return param != null && param !== '' ? `/${seg}/${param}` : `/${seg}`;
}

/**
 * History-based router hook. Holds the current pathname in state and keeps it in
 * sync with the browser (back/forward via popstate) and with navigate().
 */
export function useRouter() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to !== window.location.pathname) {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
    }
    setPath(to);
  }, []);

  return { path, navigate };
}
