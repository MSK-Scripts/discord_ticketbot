/**
 * Dashboard configuration + the safety rails around it.
 *
 * Two hard rules live here, and they are the reason a badly configured panel
 * cannot quietly end up on the open internet:
 *
 *   1. The dashboard is DISABLED by default and binds to 127.0.0.1 by default.
 *      A dashboard someone started by accident is simply not reachable from
 *      outside the machine.
 *   2. If it IS bound to a public interface without HTTPS, the process REFUSES
 *      to start (unless the operator explicitly opts out). We would rather fail
 *      loudly at boot than serve session cookies and a "restart the bot" button
 *      over plaintext.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { setEnvValue } = require('./envFile');

const ENV_PATH = path.resolve(__dirname, '../../.env');

const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim());

/** Loopback = not reachable from another machine. */
function isLoopback(host) {
  const h = String(host).trim().toLowerCase();
  return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

function loadDashboardConfig(env = process.env) {
  const host = (env.DASHBOARD_HOST || '127.0.0.1').trim();
  const port = Number.parseInt(env.DASHBOARD_PORT || '3010', 10);

  return {
    enabled:       truthy(env.DASHBOARD_ENABLED),
    host,
    port: Number.isFinite(port) ? port : 3010,
    // End-user portal opt-in. OFF by default: the dashboard is staff-only unless
    // this is set, so enabling it for your team never silently gives every guild
    // member a login. When ON, a member with no permissions may sign in and see
    // only their own tickets. See permissions.canUseDashboard.
    publicPortal:  truthy(env.DASHBOARD_PUBLIC_PORTAL),
    // Where the browser reaches the dashboard. Behind a reverse proxy this is
    // the public https URL, NOT the bind address.
    publicUrl:     (env.DASHBOARD_PUBLIC_URL || `http://${host}:${port}`).replace(/\/+$/, ''),
    allowInsecure: truthy(env.DASHBOARD_ALLOW_INSECURE),
    clientId:      env.CLIENT_ID,
    clientSecret:  env.CLIENT_SECRET,
    guildId:       env.GUILD_ID,
    exposed:       !isLoopback(host),
    // Shared secret for the trusted-proxy auth mode (hosted setup). When set, a
    // request carrying this secret + a verified Discord user id is trusted as
    // that user WITHOUT an OAuth session — msk-shop has already authenticated the
    // owner in front of us. Secret, so it lives in .env only, never config.jsonc.
    trustProxySecret: (env.DASHBOARD_TRUST_PROXY_SECRET || '').trim() || null,
  };
}

/** The OAuth redirect URI. Must match the one registered in the Discord portal exactly. */
const redirectUri = (cfg) => `${cfg.publicUrl}/auth/callback`;

/**
 * Validate the configuration. Returns a list of fatal problems (empty = ok).
 * The caller prints them and exits — same fail-fast contract as validateConfig().
 */
function validateDashboardConfig(cfg) {
  const errors = [];

  if (!Number.isFinite(cfg.port) || cfg.port < 1 || cfg.port > 65535) {
    errors.push(`DASHBOARD_PORT is not a valid port: "${cfg.port}"`);
  }

  let url;
  try {
    url = new URL(cfg.publicUrl);
  } catch {
    errors.push(`DASHBOARD_PUBLIC_URL is not a valid URL: "${cfg.publicUrl}"`);
  }

  // ── The important one ──────────────────────────────────────────────────────
  // Bound to a public interface + no HTTPS = session cookies and bot control
  // over plaintext. Refuse, unless the operator knowingly opted out (e.g. they
  // terminate TLS somewhere we cannot see).
  if (cfg.exposed && url && url.protocol !== 'https:' && !cfg.allowInsecure) {
    errors.push(
      `The dashboard is bound to a public interface (DASHBOARD_HOST=${cfg.host}) but ` +
      `DASHBOARD_PUBLIC_URL is not https ("${cfg.publicUrl}").\n` +
      '           Serving the dashboard over plaintext would expose session cookies and\n' +
      '           bot control to anyone on the network.\n' +
      '           Fix one of these:\n' +
      '             • Recommended: keep DASHBOARD_HOST=127.0.0.1 and put a reverse proxy\n' +
      '               (Apache/nginx) with TLS in front of it.\n' +
      '             • Or set DASHBOARD_PUBLIC_URL to your https:// address.\n' +
      '             • Only if you terminate TLS elsewhere: DASHBOARD_ALLOW_INSECURE=true',
    );
  }

  // A configured trust-proxy secret must be strong: it is a full bearer credential
  // for the owner's identity, so a weak one is worse than none.
  if (cfg.trustProxySecret && cfg.trustProxySecret.length < 32) {
    errors.push('DASHBOARD_TRUST_PROXY_SECRET is shorter than 32 characters. Use a long random value.');
  }

  // OAuth is how a browser signs in directly. In a pure trusted-proxy setup
  // (hosted behind msk-shop) nobody logs in here, so CLIENT_ID/SECRET are not
  // required — but if there is no proxy secret either, the panel would have no
  // way to authenticate anyone, so they stay mandatory.
  if (!cfg.trustProxySecret) {
    if (!cfg.clientId)     errors.push('CLIENT_ID is not set (required for the dashboard login).');
    if (!cfg.clientSecret) errors.push('CLIENT_SECRET is not set — add it from the Discord developer portal (OAuth2 → Client Secret).');
  }
  if (!cfg.guildId)      errors.push('GUILD_ID is not set.');

  return errors;
}

/**
 * Make sure a signing secret exists.
 *
 * Generated per installation and persisted to .env — never shipped as a default,
 * because a default secret would let anyone forge a session on EVERY installation
 * at once. Kept in .env rather than in memory so that sessions survive a restart.
 *
 * @returns {'existing'|'generated'}
 */
function ensureSessionSecret() {
  const current = process.env.SESSION_SECRET;
  if (current && current.length >= 32) return 'existing';

  const secret = crypto.randomBytes(48).toString('base64url');

  try {
    // setEnvValue UPDATES an existing SESSION_SECRET line and only appends when
    // there is none. A blind append would add a duplicate key every time the
    // value happened to be too short — exactly the bug that CRLF handling caused
    // in the setup script.
    const current = fs.readFileSync(ENV_PATH, 'utf-8');
    fs.writeFileSync(ENV_PATH, setEnvValue(current, 'SESSION_SECRET', secret), 'utf-8');
  } catch (err) {
    throw new Error(
      `SESSION_SECRET is not set and .env could not be written (${err.message}).\n` +
      `Add this line to your .env manually:\n  SESSION_SECRET="${secret}"`,
    );
  }

  process.env.SESSION_SECRET = secret;
  return 'generated';
}

module.exports = {
  loadDashboardConfig, validateDashboardConfig, ensureSessionSecret,
  redirectUri, isLoopback, truthy, ENV_PATH,
};
