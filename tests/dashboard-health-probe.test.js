/**
 * The liveness probe must not depend on who is asking.
 *
 * Regression guard for the third defect in the hosting report of 09.09.2026.
 * msk-shop checked whether an installation had come up by calling
 * /api/bot/status with the shared secret AND the customer's Discord id. That
 * route sits behind requireAuth, which resolves permissions live: the person
 * msk-shop knows as the owner of a hosted guild is not necessarily the guild
 * owner on Discord, and not necessarily staff in the bot's own dashboard. Such
 * an installation answered 403, the probe read that as "unreachable", and a bot
 * that had been running for an hour was reported as a failed install.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const sec = require('../src/dashboard/security');

const SECRET = 'x'.repeat(48);
const HEADER = sec.PROXY_SECRET_HEADER;
const USER   = sec.PROXY_USER_HEADER;

test('the secret alone is enough — no user id required', () => {
  assert.equal(sec.verifyProxySecret({ [HEADER]: SECRET }, SECRET), true);
});

test('a wrong secret is refused', () => {
  assert.equal(sec.verifyProxySecret({ [HEADER]: 'y'.repeat(48) }, SECRET), false);
});

test('a missing secret is refused', () => {
  assert.equal(sec.verifyProxySecret({}, SECRET), false);
});

test('a secret too short to be a credential is refused, however it is presented', () => {
  assert.equal(sec.verifyProxySecret({ [HEADER]: 'short' }, 'short'), false);
});

test('verifyTrustedProxy still demands a user id — identity is its whole job', () => {
  assert.equal(sec.verifyTrustedProxy({ [HEADER]: SECRET }, SECRET), null);
  assert.deepEqual(
    sec.verifyTrustedProxy({ [HEADER]: SECRET, [USER]: '2'.repeat(18) }, SECRET),
    { userId: '2'.repeat(18) },
  );
});

test('verifyTrustedProxy still rejects a user id that is not a snowflake', () => {
  assert.equal(sec.verifyTrustedProxy({ [HEADER]: SECRET, [USER]: 'admin' }, SECRET), null);
});

test('isRateLimited only reports an exhausted bucket and never counts a hit', () => {
  sec.resetRateLimits();
  const opts = { limit: 2, windowMs: 60_000 };
  for (let i = 0; i < 5; i++) assert.equal(sec.isRateLimited('health-fail:test', opts), false);
  sec.rateLimit('health-fail:test', opts);
  assert.equal(sec.isRateLimited('health-fail:test', opts), false);
  sec.rateLimit('health-fail:test', opts);
  assert.equal(sec.isRateLimited('health-fail:test', opts), true);
  sec.resetRateLimits();
});

test('the two checks disagree in exactly one direction', () => {
  // Secret only: the probe passes, the identity check does not. That asymmetry
  // is the point of the split; losing it would put the permission gate back in
  // front of a health check.
  const headers = { [HEADER]: SECRET };
  assert.equal(sec.verifyProxySecret(headers, SECRET), true);
  assert.equal(sec.verifyTrustedProxy(headers, SECRET), null);
});
