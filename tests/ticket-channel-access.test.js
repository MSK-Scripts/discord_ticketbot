/**
 * A new ticket channel denies ViewChannel to @everyone. That deny applies to
 * the bot as well, so a bot without Administrator (the permissions the startup
 * check and invite URL ask for) locked itself out of every ticket it created:
 * the opening message failed with Missing Access.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');

process.env.DATABASE_URL = 'sqlite::memory:';
const db = require('../src/database');
const { openTicket } = require('../src/utils/ticketActions');

test.before(async () => { await db.initDatabase(); });
test.after(async () => { await db.closeDatabase(); });

test('the bot gives itself access to a new ticket channel', async () => {
  let overwrites;
  const guild = {
    id: 'g1',
    roles: { everyone: 'everyone', cache: new Set() },
    // openTicket looks the member up for the eligibility check.
    members: { fetch: async (id) => ({ id, guild: { id: 'g1' }, roles: { cache: new Set() } }) },
    channels: {
      create: async (opts) => {
        overwrites = opts.permissionOverwrites;
        throw new Error('stop after channel creation');
      },
    },
  };
  const client = {
    config: { maxTicketOpened: 0 },
    user: { id: 'bot' },
    t: (key) => key,
    logger: { info() {}, warn() {}, error() {} },
  };
  const type = { codeName: 'support', staffRoles: [], cantAccess: [] };

  await openTicket(client, guild, { id: 'u1', username: 'u1' }, type, []).catch(() => null);

  const own = overwrites.find(o => o.id === 'bot');
  assert.ok(own, 'no overwrite for the bot itself');
  for (const flag of ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks']) {
    assert.ok(own.allow.includes(PermissionFlagsBits[flag]), `bot overwrite lacks ${flag}`);
  }
});
