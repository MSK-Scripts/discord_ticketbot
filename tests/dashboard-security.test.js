/**
 * Security primitive tests: sessions, CSRF, client IP and rate limiting.
 *
 * The dashboard can be publicly reachable and can restart the bot, so these are
 * the tests that actually keep strangers out.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.SESSION_SECRET = 'a'.repeat(64);

const sec = require('../src/dashboard/security');
const { loadDashboardConfig, validateDashboardConfig } = require('../src/dashboard/config');

// ── Sessions ─────────────────────────────────────────────────────────────────

test('a session round-trips', () => {
  const token = sec.createSession({ userId: '123' });
  assert.equal(sec.verifySession(token).userId, '123');
});

test('a tampered signature is rejected', () => {
  const token = sec.createSession({ userId: '123' });
  assert.equal(sec.verifySession(token.slice(0, -3) + 'aaa'), null);
});

test('a tampered payload is rejected', () => {
  const token = sec.createSession({ userId: '123' });
  assert.equal(sec.verifySession('x' + token), null);
});

test('malformed tokens are rejected', () => {
  for (const bad of ['', 'nodot', 'a.b', null, undefined, 42]) {
    assert.equal(sec.verifySession(bad), null);
  }
});

test('an expired token is rejected', () => {
  const token = sec.createToken({ userId: '1' }, { scope: 'session', ttlMs: -1000 });
  assert.equal(sec.verifySession(token), null);
});

test('a correctly signed token WITHOUT exp is rejected', () => {
  // exp is verified server-side. Relying on the cookie's maxAge would be
  // worthless: the client controls the cookie and can just keep sending it.
  const payload = Buffer.from(JSON.stringify({ userId: '1' })).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET)
    .update(`session:${payload}`).digest('base64url');

  assert.equal(sec.verifySession(`${payload}.${sig}`), null);
});

test('tokens are scope-isolated (an OAuth state is not a session)', () => {
  const state = sec.createOAuthState({ userId: '1' });
  assert.equal(sec.verifySession(state), null);
  assert.ok(sec.verifyOAuthState(state));
});

// ── CSRF ─────────────────────────────────────────────────────────────────────

test('CSRF accepts a matching cookie/header pair and nothing else', () => {
  const token = sec.createCsrfToken();
  assert.equal(sec.verifyCsrf(token, token), true);
  assert.equal(sec.verifyCsrf(token, sec.createCsrfToken()), false);
  assert.equal(sec.verifyCsrf(token, undefined), false);
  assert.equal(sec.verifyCsrf(undefined, token), false);
  assert.equal(sec.verifyCsrf('', ''), false);
});

// ── Client IP ────────────────────────────────────────────────────────────────

const req = (xff) => ({ headers: xff ? { 'x-forwarded-for': xff } : {}, socket: { remoteAddress: '10.0.0.1' } });

test('the RIGHTMOST X-Forwarded-For entry is used', () => {
  // Each proxy appends the address it saw. The rightmost entry is what our own
  // trusted proxy saw; everything to the left is client-supplied and spoofable.
  // Keying rate limits on the leftmost entry would let anyone reset their bucket.
  assert.equal(sec.getClientIp(req('1.1.1.1, 2.2.2.2, 3.3.3.3')), '3.3.3.3');
  assert.equal(sec.getClientIp(req('9.9.9.9')), '9.9.9.9');
});

test('IPv4-mapped IPv6 prefixes are stripped', () => {
  assert.equal(sec.getClientIp(req('::ffff:8.8.8.8')), '8.8.8.8');
});

test('falls back to the socket address without a proxy header', () => {
  assert.equal(sec.getClientIp(req(null)), '10.0.0.1');
});

// ── Rate limiting ────────────────────────────────────────────────────────────

test('the rate limiter allows up to the limit and then blocks', () => {
  sec.resetRateLimits();
  const opts = { limit: 3, windowMs: 60_000 };

  assert.equal(sec.rateLimit('k', opts), true);
  assert.equal(sec.rateLimit('k', opts), true);
  assert.equal(sec.rateLimit('k', opts), true);
  assert.equal(sec.rateLimit('k', opts), false, 'the 4th request must be blocked');
  assert.equal(sec.rateLimit('other', opts), true, 'a different key has its own bucket');
});

// ── Fail-fast exposure checks ────────────────────────────────────────────────

const baseEnv = { CLIENT_ID: '1', CLIENT_SECRET: '2', GUILD_ID: '3', DASHBOARD_ENABLED: 'true' };

test('the dashboard is disabled and loopback-bound by default', () => {
  const cfg = loadDashboardConfig({});
  assert.equal(cfg.enabled, false);
  assert.equal(cfg.host, '127.0.0.1');
  assert.equal(cfg.exposed, false);
});

test('a public bind without https is REFUSED', () => {
  // Serving session cookies and a "restart the bot" button over plaintext is
  // exactly what we must never let a self-hoster do by accident.
  const cfg = loadDashboardConfig({ ...baseEnv, DASHBOARD_HOST: '0.0.0.0', DASHBOARD_PUBLIC_URL: 'http://example.com' });
  const errors = validateDashboardConfig(cfg);
  assert.ok(errors.some(e => e.includes('not https')), 'expected the insecure exposure to be rejected');
});

test('loopback over http is fine, and public over https is fine', () => {
  const loopback = loadDashboardConfig({ ...baseEnv, DASHBOARD_HOST: '127.0.0.1' });
  assert.deepEqual(validateDashboardConfig(loopback), []);

  const https = loadDashboardConfig({ ...baseEnv, DASHBOARD_HOST: '0.0.0.0', DASHBOARD_PUBLIC_URL: 'https://x.example.com' });
  assert.deepEqual(validateDashboardConfig(https), []);
});

test('an explicit ALLOW_INSECURE override is honoured', () => {
  const cfg = loadDashboardConfig({
    ...baseEnv, DASHBOARD_HOST: '0.0.0.0',
    DASHBOARD_PUBLIC_URL: 'http://example.com', DASHBOARD_ALLOW_INSECURE: 'true',
  });
  assert.deepEqual(validateDashboardConfig(cfg), []);
});

test('a missing CLIENT_SECRET is a fatal error', () => {
  const cfg = loadDashboardConfig({ CLIENT_ID: '1', GUILD_ID: '3', DASHBOARD_ENABLED: 'true' });
  assert.ok(validateDashboardConfig(cfg).some(e => e.includes('CLIENT_SECRET')));
});
