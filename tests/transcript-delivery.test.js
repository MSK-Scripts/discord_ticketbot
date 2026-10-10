/**
 * Where a closed ticket's transcript goes:
 *  - never to the MSK service without a real API key (the .env.example
 *    placeholder counts as no key),
 *  - to the log channel as a file when there is no hosted link,
 *  - to the creator only when closeOption.dmUser AND transcriptToUser allow it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Stub transcript generation (it walks a real channel's history) before
// ticketActions captures it.
const transcriptPath = path.resolve(__dirname, '../src/utils/transcript.js');
require.cache[transcriptPath] = {
  id: transcriptPath, filename: transcriptPath, loaded: true,
  exports: { generateTranscript: async () => '<html>transcript</html>' },
};

process.env.DATABASE_URL = 'sqlite::memory:';
process.env.MSK_API_KEY  = 'YOUR_MSK_API_KEY_HERE';
const db = require('../src/database');
const { configuredKey, isMskConfigured } = require('../src/utils/mskApi');
const { performClose } = require('../src/utils/ticketActions');

const GUILD = 'g1';
let nextChannel = 1;

test.before(async () => { await db.initDatabase(); });
test.after(async () => { await db.closeDatabase(); });

test('the placeholder key counts as no key', () => {
  assert.equal(configuredKey('YOUR_MSK_API_KEY_HERE'), '');
  assert.equal(configuredKey('  '), '');
  assert.equal(configuredKey(undefined), '');
  assert.equal(configuredKey('real-key'), 'real-key');
  assert.equal(isMskConfigured(), false);
});

async function closeWith(closeOption) {
  const channelId = `t${nextChannel++}`;
  await db.createTicket({ channelId, guildId: GUILD, creatorId: 'creator', type: 'support' });
  const ticket = await db.getTicketByChannel(channelId);

  const sent = { log: [], dm: [] };
  const logChannel = { send: async (payload) => { sent.log.push(payload); } };
  const guild = {
    name: 'UCRP',
    channels: { fetch: async () => logChannel },
    members: {
      fetch: async () => ({
        permissions: { has: () => false },
        roles: { cache: new Set() },
        user: { tag: 'creator#0', send: async (payload) => { sent.dm.push(payload); } },
      }),
    },
  };
  const channel = {
    id: channelId,
    name: 'ticket-creator',
    guild,
    messages: { fetch: async () => new Map() },
    send: async () => null,
    setParent: async () => null,
    setName: async () => null,
    permissionOverwrites: { cache: new Map(), edit: async () => null },
  };
  const client = {
    user: { id: 'bot' },
    config: {
      closeOption: { createTranscript: true, ...closeOption },
      logs: true,
      logsChannelId: 'log',
      ticketTypes: [],
    },
    t: (key) => key,
    locale: {},
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    ticketTypeOf: () => null,
    isStaff: () => false,
  };

  // Global fetch must not be reached: no key means no upload.
  const realFetch = global.fetch;
  global.fetch = async () => { throw new Error('unexpected network call'); };
  try {
    await performClose(client, channel, ticket, { id: 'staff1', tag: 'staff#0' }, 'done');
  } finally {
    global.fetch = realFetch;
  }
  return sent;
}

test('without a key the transcript is attached to the log channel, with no warning', async () => {
  const sent = await closeWith({ dmUser: false });

  assert.equal(sent.log.length, 1);
  assert.equal(sent.log[0].files?.length, 1);
  assert.equal(sent.log[0].content, undefined);
});

test('dmUser: false sends no DM at all', async () => {
  const sent = await closeWith({ dmUser: false });
  assert.equal(sent.dm.length, 0);
});

test('transcriptToUser: false sends the close DM without the transcript', async () => {
  const sent = await closeWith({ dmUser: true, transcriptToUser: false });

  assert.equal(sent.dm.length, 1);
  assert.equal(sent.dm[0].files, undefined);
});

test('by default the close DM carries the transcript file', async () => {
  const sent = await closeWith({ dmUser: true });

  assert.equal(sent.dm.length, 1);
  assert.equal(sent.dm[0].files?.length, 1);
});
