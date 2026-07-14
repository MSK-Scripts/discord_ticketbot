/**
 * Config validation tests.
 *
 * Regression guard for a real failure: the example placeholders ("ROLE_ID_TEAM",
 * "CHANNEL_ID_HERE") passed validation, so the bot started fine and then died on
 * the FIRST ticket with a discord.js error that named neither the field nor the
 * file ("Supplied parameter is not a cached User or Role"). Validation must
 * catch this at boot and say exactly what to fix.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateConfig } = require('../src/config');

const ID = '123456789012345678'; // a valid 18-digit snowflake

const base = () => ({
  mainColor: '#5eb131',
  openTicketChannelId: ID,
  rolesWhoHaveAccessToTheTickets: [ID],
  closeOption: {},
  ticketTypes: [{ codeName: 'support', name: 'Support', categoryId: ID }],
});

// TOKEN/CLIENT_ID/GUILD_ID are checked from the environment; ignore them here.
const errorsOf = (cfg) => validateConfig(cfg).filter(e => !e.startsWith('Environment variable'));

test('a fully valid config produces no errors', () => {
  assert.deepEqual(errorsOf(base()), []);
});

test('the example ROLE_ID placeholder is rejected, and named', () => {
  const cfg = base();
  cfg.rolesWhoHaveAccessToTheTickets = ['ROLE_ID_TEAM', 'ROLE_ID_SUPPORT'];

  const errors = errorsOf(cfg);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /rolesWhoHaveAccessToTheTickets\[0\]/);
  assert.match(errors[0], /placeholder/i);
  assert.match(errors[1], /rolesWhoHaveAccessToTheTickets\[1\]/);
});

test('the example CHANNEL_ID placeholder is rejected', () => {
  const cfg = base();
  cfg.openTicketChannelId = 'CHANNEL_ID_HERE';
  assert.match(errorsOf(cfg)[0], /openTicketChannelId.*placeholder/i);
});

test('a ticket type category placeholder is rejected and points at the index', () => {
  const cfg = base();
  cfg.ticketTypes[0].categoryId = 'CATEGORY_ID_HERE';
  assert.match(errorsOf(cfg)[0], /ticketTypes\[0\]\.categoryId/);
});

test('a non-placeholder but malformed id is rejected too', () => {
  const cfg = base();
  cfg.openTicketChannelId = '12345'; // too short to be a snowflake
  assert.match(errorsOf(cfg)[0], /not a valid Discord ID/);
});

test('empty optional ids are allowed', () => {
  const cfg = base();
  cfg.claimOption = { categoryWhenClaimed: '' };
  cfg.closeOption = { closeTicketCategoryId: '' };
  assert.deepEqual(errorsOf(cfg), []);
});

test('ids are only validated for the features that are switched on', () => {
  const cfg = base();
  // logs is off → logsChannelId may stay a placeholder without breaking the boot
  cfg.logs = false;
  cfg.logsChannelId = 'LOG_CHANNEL_ID_HERE';
  cfg.pingRoleWhenOpened = false;
  cfg.roleToPingWhenOpenedId = ['ROLE_ID_TEAM'];
  assert.deepEqual(errorsOf(cfg), []);

  // …but as soon as they are enabled, the placeholder is an error
  cfg.logs = true;
  assert.match(errorsOf(cfg)[0], /logsChannelId/);
});

test('a still-invalid mainColor is caught (unchanged behaviour)', () => {
  const cfg = base();
  cfg.mainColor = 'green';
  assert.match(errorsOf(cfg)[0], /mainColor/);
});
