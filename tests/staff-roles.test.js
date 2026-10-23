/**
 * Staff checks follow the same rule as the channel permissions: a ticket type
 * with its own staffRoles is handled by those roles only.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = 'sqlite::memory:';
const db = require('../src/database');
const { TicketClient } = require('../src/client');

const GUILD = 'g1';

function member(roles = [], admin = false) {
  return {
    permissions: { has: (perm) => admin && perm === 'Administrator' },
    roles: { cache: new Set(roles) },
  };
}

// The checks only need config; skip the discord.js Client constructor.
const client = Object.create(TicketClient.prototype);
client.config = {
  rolesWhoHaveAccessToTheTickets: ['staff'],
  ticketTypes: [
    { codeName: 'general', staffRoles: [] },
    { codeName: 'tech',    staffRoles: ['tech'] },
  ],
};
const [general, tech] = client.config.ticketTypes;

test.before(async () => { await db.initDatabase(); });
test.after(async () => { await db.closeDatabase(); });

test('a type without staffRoles is handled by the global staff roles', () => {
  assert.equal(client.isStaff(member(['staff']), general), true);
  assert.equal(client.isStaff(member(['tech']), general), false);
});

test('a type with staffRoles is handled by those roles only', () => {
  assert.equal(client.isStaff(member(['tech']), tech), true);
  assert.equal(client.isStaff(member(['staff']), tech), false);
});

test('Administrator is staff everywhere', () => {
  assert.equal(client.isStaff(member([], true), tech), true);
  assert.equal(client.isAnyStaff(member([], true)), true);
});

test('isAnyStaff covers global and type-specific roles', () => {
  assert.equal(client.isAnyStaff(member(['staff'])), true);
  assert.equal(client.isAnyStaff(member(['tech'])), true);
  assert.equal(client.isAnyStaff(member(['member'])), false);
});

test('isStaffIn resolves the ticket type from the channel', async () => {
  await db.createTicket({ channelId: 'tech-chan', guildId: GUILD, creatorId: 'u1', type: 'tech' });

  assert.equal(await client.isStaffIn(member(['tech']), 'tech-chan'), true);
  assert.equal(await client.isStaffIn(member(['staff']), 'tech-chan'), false);
  // Outside a ticket channel any staff role counts.
  assert.equal(await client.isStaffIn(member(['tech']), 'not-a-ticket'), true);
  assert.equal(await client.isStaffIn(member(['member']), 'not-a-ticket'), false);
});
