/**
 * API client.
 *
 * Every mutating request echoes the CSRF cookie back in a header. That is the
 * double-submit pattern: a cross-origin attacker can make the browser SEND the
 * cookie, but cannot READ it to build the matching header.
 */

const CSRF_COOKIE = 'tb_csrf';

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error || `Request failed (${status})`);
    this.status = status;
    this.detail = payload?.detail;
    // Set when the dashboard is staff-only and this member has no access. Lets the
    // UI show a "limited to staff" screen instead of an endless sign-in loop.
    this.portalClosed = payload?.portalClosed === true;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'x-csrf-token': readCookie(CSRF_COOKIE) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Session gone or expired → back to the Discord login.
  if (res.status === 401) {
    window.location.href = '/auth/login';
    return new Promise(() => {}); // never resolves; we are navigating away
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, payload);
  return payload;
}

export const api = {
  me: () => request('/me'),

  tickets: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    );
    return request(`/tickets?${q}`);
  },
  myTickets: () => request('/tickets/mine'),
  ticket: (id) => request(`/tickets/${id}`),
  messages: (id, before) => request(`/tickets/${id}/messages${before ? `?before=${before}` : ''}`),
  reply: (id, content) => request(`/tickets/${id}/reply`, { method: 'POST', body: { content } }),
  ticketAction: (id, action, body = {}) =>
    request(`/tickets/${id}/${action}`, { method: 'POST', body }),

  stats: () => request('/stats'),
  lookups: () => request('/lookups'),
  users: (ids) => request(`/users?ids=${ids.join(',')}`),

  config: (file) => request(`/config/${file}`),
  saveConfig: (file, content) => request(`/config/${file}`, { method: 'PUT', body: { content } }),

  locales: () => request('/locales'),
  locale: (name) => request(`/locales/${encodeURIComponent(name)}`),
  saveLocale: (name, content) => request(`/locales/${encodeURIComponent(name)}`, { method: 'PUT', body: { content } }),

  botStatus: () => request('/bot/status'),
  botLogs: () => request('/bot/logs'),
  botAction: (action) => request(`/bot/${action}`, { method: 'POST' }),

  access: () => request('/access'),
  saveAccess: (entry) => request('/access', { method: 'PUT', body: entry }),
  deleteAccess: (type, id) => request(`/access/${type}/${id}`, { method: 'DELETE' }),
  auditLog: () => request('/access/audit'),

  blacklist: () => request('/blacklist'),
  addBlacklist: (userId, reason) => request('/blacklist', { method: 'POST', body: { userId, reason } }),
  removeBlacklist: (userId) => request(`/blacklist/${userId}`, { method: 'DELETE' }),

  // Dashboard appearance (owner-only).
  dashboardSettings: () => request('/dashboard-settings'),
  saveAccent: (accent) => request('/dashboard-settings', { method: 'PUT', body: { accent } }),
  resetFavicon: () => request('/dashboard-settings/favicon', { method: 'DELETE' }),

  // Favicon upload sends the raw image bytes, not JSON, so it needs its own call.
  uploadFavicon: async (file) => {
    const res = await fetch('/api/dashboard-settings/favicon', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'x-csrf-token': readCookie(CSRF_COOKIE),
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (res.status === 401) { window.location.href = '/auth/login'; return new Promise(() => {}); }
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, payload);
    return payload;
  },
};

/** Logout needs a raw call: it lives outside /api. */
export async function logout() {
  await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'x-csrf-token': readCookie(CSRF_COOKIE) },
  });
  window.location.href = '/';
}
