/**
 * Update notice in the log channel.
 *
 * The two things worth guarding: the same version must never be announced twice
 * (a bot that restarts often would otherwise repeat itself on every boot), and the
 * defaults must stay what the docs promise — on, hourly — when the config block is
 * missing entirely, which is the case for every config written before this feature.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldAnnounce, resolveConfig, DEFAULT_INTERVAL_HOURS, MIN_INTERVAL_HOURS } =
  require('../src/utils/updateNotice');
const { isNewer } = require('../src/utils/versionCheck');

// ── shouldAnnounce ───────────────────────────────────────────────────────────

test('a newer release that was never announced is announced', () => {
  assert.equal(shouldAnnounce('2.14.0', '2.15.0', null), true);
});

test('the same version is not announced twice', () => {
  assert.equal(shouldAnnounce('2.14.0', '2.15.0', '2.15.0'), false);
});

test('a version newer than the one already announced is announced again', () => {
  assert.equal(shouldAnnounce('2.14.0', '2.16.0', '2.15.0'), true);
});

test('being up to date announces nothing', () => {
  assert.equal(shouldAnnounce('2.15.0', '2.15.0', null), false);
});

test('a local version ahead of the release announces nothing', () => {
  assert.equal(shouldAnnounce('2.16.0', '2.15.0', null), false);
});

test('a missing release announces nothing', () => {
  assert.equal(shouldAnnounce('2.14.0', null, null), false);
});

// ── resolveConfig ────────────────────────────────────────────────────────────

const cfg = (updateNotification) => resolveConfig({ config: { updateNotification } });

test('a missing config block means on and hourly', () => {
  assert.deepEqual(cfg(undefined), { enabled: true, intervalHours: DEFAULT_INTERVAL_HOURS });
});

test('only an explicit false turns it off', () => {
  assert.equal(cfg({ enabled: false }).enabled, false);
  assert.equal(cfg({ enabled: true }).enabled, true);
  assert.equal(cfg({}).enabled, true);
});

test('an interval below the minimum is raised, not accepted', () => {
  assert.equal(cfg({ intervalHours: 0.01 }).intervalHours, MIN_INTERVAL_HOURS);
});

test('a nonsense interval falls back to the default instead of scheduling NaN', () => {
  assert.equal(cfg({ intervalHours: 'soon' }).intervalHours, DEFAULT_INTERVAL_HOURS);
  assert.equal(cfg({ intervalHours: 0 }).intervalHours, DEFAULT_INTERVAL_HOURS);
  assert.equal(cfg({ intervalHours: -5 }).intervalHours, DEFAULT_INTERVAL_HOURS);
});

test('a sane interval is passed through', () => {
  assert.equal(cfg({ intervalHours: 6 }).intervalHours, 6);
});

// ── isNewer, reused by the notice ────────────────────────────────────────────

test('version comparison handles the v prefix and every position', () => {
  assert.equal(isNewer('2.14.0', 'v2.14.1'), true);
  assert.equal(isNewer('2.14.0', 'v2.14.0'), false);
  assert.equal(isNewer('2.9.0',  '2.10.0'),  true, 'must compare numerically, not as strings');
  assert.equal(isNewer('3.0.0',  '2.99.99'), false);
});
