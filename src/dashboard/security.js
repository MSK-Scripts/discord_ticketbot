/**
 * Security primitives for the dashboard: sessions, CSRF, rate limiting and
 * client-IP resolution.
 *
 * Ported from the hardened /admin dashboard of msk-shop, with one deliberate
 * tightening: this panel can be reachable from the public internet, so a
 * double-submit CSRF token is required on top of SameSite + origin checks.
 *
 * Pure crypto/logic — no Express, no Discord, no DB. Testable in isolation.
 */

const crypto = require('crypto');

const SESSION_COOKIE = 'tb_session';
const CSRF_COOKIE    = 'tb_csrf';
const CSRF_HEADER    = 'x-csrf-token';
const STATE_COOKIE   = 'tb_oauth_state';

// Trusted-proxy auth (hosted setup): msk-shop authenticates the owner and forwards
// the request with a shared secret plus the verified Discord user id.
const PROXY_SECRET_HEADER = 'x-dashboard-proxy-secret';
const PROXY_USER_HEADER   = 'x-dashboard-user';
const SNOWFLAKE_RE        = /^\d{17,20}$/;

const SESSION_TTL_MS = 60 * 60 * 1000;      // 1 h
const STATE_TTL_MS   = 10 * 60 * 1000;      // 10 min

/**
 * Read the signing secret. Deliberately lazy and throwing: there is NO fallback
 * placeholder. A shipped default secret would let anyone forge a session on
 * every installation at once.
 */
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. Run `npm run dashboard:setup` to generate one.',
    );
  }
  return secret;
}

const b64url = (input) => Buffer.from(input).toString('base64url');

/**
 * Sign a payload for a specific scope. The scope is part of the signed data, so
 * a token minted for one purpose (e.g. the OAuth state) can never validate as
 * another (e.g. a session).
 */
function sign(scope, payloadB64) {
  return crypto.createHmac('sha256', getSecret())
    .update(`${scope}:${payloadB64}`)
    .digest('base64url');
}

/** Constant-time compare of two strings of arbitrary length. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  // timingSafeEqual throws on length mismatch, so the length check has to come
  // first. Length is not secret here (both are fixed-size digests/tokens).
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

/**
 * Create a stateless, HMAC-signed token: base64url(json).base64url(sig)
 *
 * `exp` lives INSIDE the signed payload and is verified server-side. Relying on
 * the cookie's maxAge alone would be worthless: the cookie is under the client's
 * control and they can simply keep sending an "expired" one.
 */
function createToken(data, { scope = 'session', ttlMs = SESSION_TTL_MS } = {}) {
  const payload = { ...data, exp: Date.now() + ttlMs };
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(scope, encoded)}`;
}

/**
 * Verify a token and return its payload, or null.
 * Rejects: bad shape, tampered signature, wrong scope, missing exp, expired exp.
 */
function verifyToken(token, { scope = 'session' } = {}) {
  if (typeof token !== 'string' || token.length === 0) return null;

  // Split at the LAST dot — base64url never contains '.', but this is robust
  // even if the payload encoding ever changes.
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;

  const encoded  = token.slice(0, idx);
  const provided = token.slice(idx + 1);
  if (!safeEqual(provided, sign(scope, encoded))) return null;

  let data;
  try {
    data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;

  // A correctly signed token WITHOUT an exp must also be rejected — otherwise a
  // token minted before exp was introduced would be valid forever.
  if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;

  return data;
}

const createSession = (data) => createToken(data, { scope: 'session' });
const verifySession = (token) => verifyToken(token, { scope: 'session' });

/** OAuth state token — signed and short-lived, so it needs no server-side store. */
const createOAuthState = (data = {}) =>
  createToken({ ...data, nonce: crypto.randomBytes(16).toString('hex') },
    { scope: 'oauth', ttlMs: STATE_TTL_MS });
const verifyOAuthState = (token) => verifyToken(token, { scope: 'oauth' });

// ── CSRF (double submit) ─────────────────────────────────────────────────────
//
// The token is stored in a NON-httpOnly cookie and must be echoed back in a
// header. An attacker on another origin can cause the browser to send the
// cookie, but cannot READ it to set the header (same-origin policy), so they
// cannot forge a matching pair.

const createCsrfToken = () => crypto.randomBytes(32).toString('base64url');

function verifyCsrf(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) return false;
  return safeEqual(cookieToken, headerToken);
}

// ── Trusted proxy ──────────────────────────────────────────────────────────────
//
// For the hosted setup, msk-shop sits in front, authenticates the guild owner and
// forwards the request to the loopback-bound bot dashboard with a shared secret
// and the verified user id. We trust IDENTITY only — authorization is still
// resolved live from the DB per request, exactly as for a cookie session.
//
// Returns { userId } when the request is a valid trusted-proxy call, else null.
// null means "fall through to the normal cookie-session path", so an absent or
// mismatched secret simply behaves like an unauthenticated browser request.
function verifyTrustedProxy(headers, secret) {
  // Not configured, or configured too weakly to be a real credential.
  if (typeof secret !== 'string' || secret.length < 32) return null;
  if (!headers) return null;

  const provided = headers[PROXY_SECRET_HEADER];
  const userId   = headers[PROXY_USER_HEADER];
  if (!provided || !userId) return null;
  if (!SNOWFLAKE_RE.test(String(userId))) return null;
  if (!safeEqual(provided, secret)) return null;

  return { userId: String(userId) };
}

// ── Client IP ────────────────────────────────────────────────────────────────

/**
 * Resolve the real client IP behind exactly ONE trusted reverse proxy.
 *
 * We take the RIGHTMOST X-Forwarded-For entry, not the leftmost. Each proxy
 * APPENDS the address it received the request from, so the rightmost entry is
 * what our own trusted proxy saw — i.e. the real client. Everything to the left
 * is attacker-controlled: a client can send `X-Forwarded-For: 1.2.3.4` and, if
 * we keyed on the leftmost token, reset their own rate-limit bucket at will.
 *
 * If a CDN (e.g. Cloudflare) is ever put in front, this must be revisited and
 * keyed on that CDN's trusted header instead.
 */
function getClientIp(req) {
  const strip = (ip) => String(ip).trim().replace(/^::ffff:/, '');

  const xff = req.headers?.['x-forwarded-for'];
  if (xff) {
    const parts = String(xff).split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return strip(parts[parts.length - 1]);
  }
  const real = req.headers?.['x-real-ip'];
  if (real) return strip(real);

  return strip(req.socket?.remoteAddress ?? '127.0.0.1');
}

// ── Rate limiting ────────────────────────────────────────────────────────────
//
// In-memory fixed window. That is exactly right here: the dashboard is a single
// Node process. It does NOT survive a restart and would not work across a PM2
// cluster — both are acceptable, and a restart only ever resets limits, it never
// grants extra access.

const buckets = new Map();

/**
 * @returns {boolean} true = request allowed, false = over the limit
 */
function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Seconds until the bucket resets — for the Retry-After header. */
function retryAfter(key) {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  return Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 1000));
}

function resetRateLimits() {
  buckets.clear();
}

// Drop expired buckets so the map cannot grow unbounded. unref() so this timer
// never keeps the process alive on its own.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000);
if (typeof sweeper.unref === 'function') sweeper.unref();

module.exports = {
  SESSION_COOKIE, CSRF_COOKIE, CSRF_HEADER, STATE_COOKIE,
  PROXY_SECRET_HEADER, PROXY_USER_HEADER,
  SESSION_TTL_MS, STATE_TTL_MS,
  getSecret, safeEqual,
  createToken, verifyToken,
  createSession, verifySession,
  createOAuthState, verifyOAuthState,
  createCsrfToken, verifyCsrf, verifyTrustedProxy,
  getClientIp,
  rateLimit, retryAfter, resetRateLimits,
};
