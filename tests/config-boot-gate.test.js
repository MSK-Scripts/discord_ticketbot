/**
 * Which configuration problems may stop the bot from booting.
 *
 * Regression guard for a real dead end: a fresh install has no config.jsonc, the
 * bot writes one from the example, and every id in that example is a placeholder.
 * While placeholders were fatal, such an install crash-looped until the
 * supervisor gave up — and the editor to fix it lives in the bot's own dashboard,
 * which a dead bot does not serve. Nobody could get out.
 *
 * So the rule these tests pin down is: an UNFINISHED config lets the bot boot
 * (with the ticket flow closed), a BROKEN one does not.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { inspectConfig, validateConfig } = require('../src/config');

const ID = '123456789012345678'; // a valid 18-digit snowflake

const base = () => ({
  mainColor: '#5eb131',
  openTicketChannelId: ID,
  rolesWhoHaveAccessToTheTickets: [ID],
  closeOption: {},
  ticketTypes: [{ codeName: 'support', name: 'Support', categoryId: ID }],
});

// TOKEN/CLIENT_ID/GUILD_ID come from the environment, which the test runner does
// not set; they are checked by their own test below.
const notEnv = (list) => list.filter(e => !e.startsWith('Environment variable'));
const inspect = (cfg) => {
  const { fatal, pending } = inspectConfig(cfg);
  return { fatal: notEnv(fatal), pending };
};

// ── The example, verbatim ────────────────────────────────────────────────────

test('a config full of example placeholders is pending, never fatal', () => {
  const cfg = base();
  cfg.openTicketChannelId = 'CHANNEL_ID_HERE';
  cfg.rolesWhoHaveAccessToTheTickets = ['ROLE_ID_TEAM', 'ROLE_ID_SUPPORT'];
  cfg.ticketTypes[0].categoryId = 'CATEGORY_ID_HERE';

  const { fatal, pending } = inspect(cfg);
  assert.deepEqual(fatal, [], 'placeholders must not stop the boot');
  assert.equal(pending.length, 4);
  assert.ok(pending.every(e => /placeholder/i.test(e)));
});

test('the real config.example.jsonc boots', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { stripJsonComments } = require('../src/config');

  const raw = fs.readFileSync(
    path.resolve(__dirname, '../config/config.example.jsonc'), 'utf-8');
  const cfg = JSON.parse(stripJsonComments(raw));

  const { fatal, pending } = inspect(cfg);
  assert.deepEqual(fatal, [], 'the shipped example must never be fatal');
  assert.ok(pending.length > 0, 'and it must be reported as unfinished');
});

// ── Unfinished ───────────────────────────────────────────────────────────────

test('a malformed id is pending, not fatal — it is indistinguishable from unfilled', () => {
  const cfg = base();
  cfg.openTicketChannelId = '12345';
  const { fatal, pending } = inspect(cfg);
  assert.deepEqual(fatal, []);
  assert.match(pending[0], /not a valid Discord ID/);
});

test('a blank required string is pending', () => {
  const cfg = base();
  cfg.openTicketChannelId = '   ';
  const { fatal, pending } = inspect(cfg);
  assert.deepEqual(fatal, []);
  assert.match(pending[0], /is empty/);
});

test('a ticket type without a category is pending', () => {
  const cfg = base();
  delete cfg.ticketTypes[0].categoryId;
  const { fatal, pending } = inspect(cfg);
  assert.deepEqual(fatal, []);
  assert.match(pending[0], /ticketTypes\[0\] is missing "categoryId"/);
});

// ── Broken ───────────────────────────────────────────────────────────────────

test('a missing required field is fatal', () => {
  const cfg = base();
  delete cfg.closeOption;
  const { fatal, pending } = inspect(cfg);
  assert.match(fatal[0], /Missing required field: "closeOption"/);
  assert.deepEqual(pending, []);
});

test('a wrong type is fatal', () => {
  const cfg = base();
  cfg.rolesWhoHaveAccessToTheTickets = 'everyone';
  assert.match(inspect(cfg).fatal[0], /must be a array, got string/);
});

test('a non-hex mainColor is fatal — it breaks every embed, not just tickets', () => {
  const cfg = base();
  cfg.mainColor = 'green';
  assert.match(inspect(cfg).fatal[0], /must be a hex color/);
});

test('an empty ticketTypes list is fatal', () => {
  const cfg = base();
  cfg.ticketTypes = [];
  assert.match(inspect(cfg).fatal[0], /at least one entry/);
});

test('a ticket type without a name is fatal', () => {
  const cfg = base();
  delete cfg.ticketTypes[0].name;
  assert.match(inspect(cfg).fatal[0], /is missing "name"/);
});

test('missing credentials are fatal — there is nothing to stay up for', () => {
  const { fatal } = inspectConfig(base());
  assert.ok(fatal.some(e => e === 'Environment variable TOKEN is not set.'));
});

// ── The two views agree ──────────────────────────────────────────────────────

test('validateConfig still reports both buckets, for the dashboard editor', () => {
  const cfg = base();
  cfg.mainColor = 'green';                       // fatal
  cfg.openTicketChannelId = 'CHANNEL_ID_HERE';   // pending

  const all = notEnv(validateConfig(cfg));
  const { fatal, pending } = inspect(cfg);
  assert.deepEqual(all, [...fatal, ...pending]);
  assert.equal(all.length, 2);
});

test('a valid config is neither fatal nor pending', () => {
  const { fatal, pending } = inspect(base());
  assert.deepEqual(fatal, []);
  assert.deepEqual(pending, []);
});
