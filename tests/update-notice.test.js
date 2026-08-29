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
const { isNewer, parseRelease } = require('../src/utils/versionCheck');

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

// ── parseRelease ────────────────────────────────────────────────────────────
// Both values from the GitHub payload leave the network boundary here: the
// version is written to data/update-notice.json, the url becomes the link of an
// embed everyone in the log channel sees. CodeQL flagged the first as
// "network data written to file" (js/http-to-file-access), which is the right
// instinct even though the source is api.github.com over TLS.

test('parseRelease accepts a normal release and keeps its url', () => {
  assert.deepStrictEqual(
    parseRelease({
      tag_name: 'v2.16.0',
      html_url: 'https://github.com/MSK-Scripts/discord_ticketbot/releases/tag/v2.16.0',
    }),
    { version: '2.16.0', url: 'https://github.com/MSK-Scripts/discord_ticketbot/releases/tag/v2.16.0' },
  );
});

test('parseRelease strips the v prefix and tolerates prereleases', () => {
  assert.strictEqual(parseRelease({ tag_name: 'v3.0.0-rc.1' }).version, '3.0.0-rc.1');
  assert.strictEqual(parseRelease({ tag_name: '10.2' }).version, '10.2');
});

test('parseRelease refuses a tag that is not a version', () => {
  for (const tag of ['<script>alert(1)</script>', 'latest', '../../etc/passwd', 'v1.0.0; rm -rf /']) {
    const out = parseRelease({ tag_name: tag });
    assert.ok(out.error, `"${tag}" should be rejected`);
    assert.strictEqual(out.version, undefined);
  }
});

test('parseRelease falls back when the url points somewhere else', () => {
  // Only a link into this repository is passed through; anything else becomes
  // the releases page rather than a link the bot posts on someone's behalf.
  for (const url of ['https://evil.example/x', 'javascript:alert(1)', 'https://github.com/other/repo/releases', 42]) {
    assert.strictEqual(
      parseRelease({ tag_name: '1.0.0', html_url: url }).url,
      'https://github.com/MSK-Scripts/discord_ticketbot/releases',
    );
  }
});

test('parseRelease treats a missing tag as no release', () => {
  assert.ok(parseRelease({}).error);
  assert.ok(parseRelease({ tag_name: '' }).error);
  assert.ok(parseRelease(null).error);
});
