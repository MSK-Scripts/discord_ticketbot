/**
 * Dashboard HTTP server.
 *
 * The whole security posture lives in ONE middleware chain, defined once:
 *
 *   helmet/CSP → trust proxy → body limit → global rate limit
 *     → requireAuth → originCheck (non-GET) → csrf (non-GET)
 *     → requirePermission(...) → handler → errorNormalizer
 *
 * Defining it once is the point: a route physically cannot forget a check,
 * because it never gets to run without one.
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');

const db = require('../database');
const sec = require('./security');
const { selectAccessRows, resolvePermissions, hasPermission } = require('./permissions');
const { resolveMemberContext } = require('./discord');
const { buildAuthorizeUrl, exchangeCode, fetchOAuthUser } = require('./auth');
const { registerRoutes } = require('./routes');

const WEB_DIST = path.resolve(__dirname, '../../web/dist');

// Rate limit tiers. The login endpoints are far stricter than normal browsing:
// that is where an attacker would grind, and a legitimate user hits them twice.
const LIMIT_GLOBAL = { limit: 240, windowMs: 60_000 };   // per IP
const LIMIT_AUTH   = { limit: 10,  windowMs: 5 * 60_000 }; // per IP
const LIMIT_WRITE  = { limit: 30,  windowMs: 60_000 };   // per user

/** Cookie parsing without pulling in cookie-parser. */
function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

/**
 * Short-lived cache for Discord member lookups.
 *
 * Without this, every single request would cost 2 Discord REST calls (guild +
 * member) and would burn through the bot's global 50 req/s budget. The trade-off
 * is that a ROLE change in Discord takes up to 60s to be reflected. Permission
 * changes made in the dashboard itself are NOT cached — those come from the DB
 * and take effect immediately.
 */
const memberCache = new Map();
const MEMBER_TTL_MS = 60_000;

async function getMemberContext(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const hit = memberCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await resolveMemberContext(guildId, userId);
  memberCache.set(key, { value, expiresAt: Date.now() + MEMBER_TTL_MS });
  return value;
}

function invalidateMemberCache() {
  memberCache.clear();
}

async function startServer({ config, supervisor }) {
  // The dashboard process is separate from the bot process, so it needs its own
  // database connection.
  await db.initDatabase();

  const app = express();

  // Exactly ONE trusted reverse proxy. This makes Express resolve req.ip from
  // the rightmost X-Forwarded-For entry; trusting the leftmost would let any
  // client spoof their IP and reset their own rate-limit bucket.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // frame-ancestors: 'none' by default. It is configurable because the hosted
  // setup embeds this dashboard behind msk-shop's authentication.
  const frameAncestors = (process.env.DASHBOARD_FRAME_ANCESTORS || "'none'")
    .split(/\s+/).filter(Boolean);

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'style-src-attr': ["'unsafe-inline'"], // React sets element.style directly
        'img-src': ["'self'", 'data:', 'https://cdn.discordapp.com'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': frameAncestors,
        'object-src': ["'none'"],
      },
    },
    // Only meaningful over HTTPS; harmless otherwise.
    hsts: config.publicUrl.startsWith('https://')
      ? { maxAge: 63072000, includeSubDomains: true, preload: true }
      : false,
    crossOriginEmbedderPolicy: false,
  }));

  // Body limit BEFORE parsing, so a huge payload is rejected instead of buffered.
  app.use(express.json({ limit: '64kb' }));

  app.use((req, res, next) => {
    req.cookies = parseCookies(req);
    req.clientIp = sec.getClientIp(req);
    next();
  });

  // ── Global rate limit ──────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const key = `global:${req.clientIp}`;
    if (!sec.rateLimit(key, LIMIT_GLOBAL)) {
      res.set('Retry-After', String(sec.retryAfter(key)));
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    next();
  });

  const secureCookie = config.publicUrl.startsWith('https://');
  const cookieBase = { httpOnly: true, secure: secureCookie, sameSite: 'lax', path: '/' };

  // ── OAuth ──────────────────────────────────────────────────────────────────

  app.get('/auth/login', (req, res) => {
    const key = `auth:${req.clientIp}`;
    if (!sec.rateLimit(key, LIMIT_AUTH)) {
      return res.status(429).send('Too many login attempts. Please try again later.');
    }
    const state = sec.createOAuthState();
    res.cookie(sec.STATE_COOKIE, state, { ...cookieBase, maxAge: sec.STATE_TTL_MS });
    res.redirect(buildAuthorizeUrl(config, state));
  });

  app.get('/auth/callback', async (req, res) => {
    const key = `auth:${req.clientIp}`;
    if (!sec.rateLimit(key, LIMIT_AUTH)) {
      return res.status(429).send('Too many login attempts. Please try again later.');
    }

    // The state cookie is cleared on EVERY path, success or failure, so a stale
    // state can never be replayed.
    const stateCookie = req.cookies[sec.STATE_COOKIE];
    res.clearCookie(sec.STATE_COOKIE, { path: '/' });

    const { code, state } = req.query;
    if (!code || !state || !stateCookie || !sec.safeEqual(state, stateCookie) || !sec.verifyOAuthState(state)) {
      return res.status(400).send('Login failed: invalid or expired state. Please try again.');
    }

    try {
      const token = await exchangeCode(config, String(code));
      const user = await fetchOAuthUser(token.access_token);

      // Membership is resolved server-side. A user who is not in the guild (and
      // is not the owner) never gets a session at all.
      const ctx = await getMemberContext(config.guildId, user.id);
      if (!ctx.inGuild && !ctx.isOwner) {
        return res.status(403).send('You are not a member of this server.');
      }

      const session = sec.createSession({ userId: user.id, name: user.displayName, avatar: user.avatar });
      res.cookie(sec.SESSION_COOKIE, session, { ...cookieBase, maxAge: sec.SESSION_TTL_MS });

      // The CSRF cookie is deliberately NOT httpOnly: the frontend has to read it
      // to echo it back in a header. That is the whole double-submit idea — a
      // cross-origin attacker can make the browser SEND the cookie but cannot
      // READ it, so they cannot produce a matching header.
      res.cookie(sec.CSRF_COOKIE, sec.createCsrfToken(), {
        httpOnly: false, secure: secureCookie, sameSite: 'lax', path: '/', maxAge: sec.SESSION_TTL_MS,
      });

      res.redirect('/');
    } catch (err) {
      console.error('[Dashboard] OAuth callback failed:', err.message);
      res.status(500).send('Login failed. Please try again.');
    }
  });

  app.post('/auth/logout', (req, res) => {
    res.clearCookie(sec.SESSION_COOKIE, { path: '/' });
    res.clearCookie(sec.CSRF_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  // ── Auth + permission middleware ───────────────────────────────────────────

  /**
   * Establishes who the caller is and what they may do.
   *
   * Permissions are loaded LIVE from the DB on every request and are never baked
   * into the session — so revoking someone's access takes effect immediately
   * instead of when their token happens to expire.
   */
  async function requireAuth(req, res, next) {
    const session = sec.verifySession(req.cookies[sec.SESSION_COOKIE]);
    if (!session?.userId) return res.status(401).json({ error: 'Not signed in.' });

    try {
      const ctx = await getMemberContext(config.guildId, session.userId);
      if (!ctx.inGuild && !ctx.isOwner) {
        return res.status(403).json({ error: 'You are not a member of this server.' });
      }

      const rows = await db.getDashboardAccess(config.guildId);
      const { userRow, roleRows } = selectAccessRows(rows, session.userId, ctx.roleIds);

      req.auth = {
        userId: session.userId,
        name: session.name,
        avatar: session.avatar,
        isOwner: ctx.isOwner,
        roleIds: ctx.roleIds,
        permissions: resolvePermissions({ isOwner: ctx.isOwner, userRow, roleRows }),
        guildId: config.guildId,
      };
      next();
    } catch (err) {
      next(err);
    }
  }

  /** Origin check + CSRF token. Applied to every state-changing method. */
  function requireCsrf(req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD') return next();

    const origin = req.headers.origin;
    if (origin && origin !== config.publicUrl) {
      return res.status(403).json({ error: 'Bad origin.' });
    }
    if (!sec.verifyCsrf(req.cookies[sec.CSRF_COOKIE], req.headers[sec.CSRF_HEADER])) {
      return res.status(403).json({ error: 'Invalid CSRF token.' });
    }

    // Per-user write budget, on top of the per-IP one. A browser client must not
    // be able to spend the bot's global Discord rate-limit quota.
    const key = `write:${req.auth.userId}`;
    if (!sec.rateLimit(key, LIMIT_WRITE)) {
      res.set('Retry-After', String(sec.retryAfter(key)));
      return res.status(429).json({ error: 'Too many changes. Please slow down.' });
    }
    next();
  }

  /** @param {string|string[]} required — an array means "any of". */
  function requirePermission(required) {
    return (req, res, next) => {
      if (!hasPermission(req.auth.permissions, required)) {
        return res.status(403).json({ error: 'You do not have permission to do this.' });
      }
      next();
    };
  }

  // ── API ────────────────────────────────────────────────────────────────────

  const api = express.Router();
  api.use(requireAuth);
  api.use(requireCsrf);

  api.get('/me', (req, res) => {
    res.json({
      user: { id: req.auth.userId, name: req.auth.name, avatar: req.auth.avatar },
      isOwner: req.auth.isOwner,
      permissions: req.auth.permissions,
    });
  });

  registerRoutes(api, { config, supervisor, requirePermission, invalidateMemberCache });

  app.use('/api', api);

  // ── Static SPA ─────────────────────────────────────────────────────────────

  /**
   * Caching, and why index.html MUST NOT be cached.
   *
   * Vite emits hashed asset filenames (index-a1b2c3.js), so those are immutable
   * and can be cached forever — a new build produces a new name.
   *
   * index.html is the opposite: its name never changes, but its CONTENT points at
   * the current hashed bundle. If the browser is allowed to cache it, then after
   * an update the user keeps loading the OLD index.html, which references a bundle
   * that no longer exists — they either see a stale UI or a blank page, and no
   * amount of normal reloading fixes it. So: no-store, always.
   */
  app.use(express.static(WEB_DIST, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  // SPA fallback. Written as plain middleware rather than app.get('*'): Express 5
  // switched to path-to-regexp v8, where a bare '*' is no longer a valid path
  // and throws at registration time.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();

    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(WEB_DIST, 'index.html'), (err) => {
      if (err) {
        res.status(500).send(
          'The dashboard UI is not built. Run `npm run build` inside web/, or reinstall the bot.',
        );
      }
    });
  });

  // ── Error normalizer ───────────────────────────────────────────────────────
  // One place, so no route can accidentally leak a stack trace to the browser.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error('[Dashboard] route error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  await new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host, resolve);
    server.on('error', reject);
  });

  return app;
}

module.exports = { startServer, parseCookies };
