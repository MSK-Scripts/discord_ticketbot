/**
 * Discord user names, resolved once and shared across every view.
 *
 * The API stores snowflakes, so almost every screen has an id it needs to show
 * as a name. Resolving per component would mean one request per cell — a
 * 25-row ticket list would fire 50. So ids from all mounted components are
 * collected into one batch, sent as a single request, and cached module-wide.
 */

import { useEffect, useState } from 'react';
import { api } from './api.js';
import { useT } from './i18n.jsx';

const cache = new Map();      // id → user | null (null = resolved, but unknown)
const listeners = new Set();  // components waiting for the batch to land

let queue = new Set();
let timer = null;

const notify = () => listeners.forEach(fn => fn());

function flush() {
  timer = null;
  const ids = [...queue];
  queue = new Set();
  if (ids.length === 0) return;

  // The endpoint caps at 50 ids per call.
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    api.users(chunk)
      .then(({ users }) => chunk.forEach(id => cache.set(id, users?.[id] ?? null)))
      // A failed lookup must not retry forever — cache the miss and show the id.
      .catch(() => chunk.forEach(id => cache.set(id, null)))
      .finally(notify);
  }
}

function enqueue(ids) {
  let added = false;
  for (const id of ids) {
    if (id && !cache.has(id) && !queue.has(id)) { queue.add(id); added = true; }
  }
  // Coalesce every id requested in this tick into one round trip.
  if (added && timer === null) timer = setTimeout(flush, 20);
}

/** Subscribe to the shared cache and request any ids that are still missing. */
export function useUsers(ids) {
  const [, rerender] = useState(0);
  const key = ids.filter(Boolean).join(',');

  useEffect(() => {
    const listener = () => rerender(n => n + 1);
    listeners.add(listener);
    enqueue(key ? key.split(',') : []);
    return () => listeners.delete(listener);
  }, [key]);

  return cache;
}

/**
 * Renders a user id as their name. Falls back to the raw id while loading and
 * when Discord cannot resolve it (deleted account) — that is honest, and still
 * copy-pasteable, which a "Unknown user" placeholder would not be.
 */
export function UserName({ id, fallback = '—' }) {
  const resolved = useUsers(id ? [id] : []);
  const t = useT();
  if (!id) return <span className="text-muted-foreground">{fallback}</span>;

  const user = resolved.get(id);
  if (!user) return <span className="font-mono text-xs text-muted-foreground" title={id}>{id}</span>;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5" title={`${user.username ?? user.name} · ${id}`}>
      {user.avatar && <img className="size-5 shrink-0 rounded-full bg-white/8" src={user.avatar} alt="" />}
      <span className="truncate">{user.name}</span>
      {!user.inGuild && <span className="text-muted-foreground" title={t('user.leftTitle')}> {t('user.left')}</span>}
    </span>
  );
}
