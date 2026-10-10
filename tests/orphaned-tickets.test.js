/**
 * Tickets whose channel is gone must not stay "open" in the DB: an open row
 * counts against maxTicketOpened forever and is skipped by the background loops.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = 'sqlite::memory:';
const db = require('../src/database');
const {
  closeOrphanedTicket,
  fetchTicketChannel,
  captureFinalTranscript,
} = require('../src/utils/ticketActions');

const GUILD = 'g1';
let nextChannel = 1;

function fakeClient(overrides = {}) {
  return {
    user:   { id: 'bot' },
    config: { closeOption: { createTranscript: false } },
    t:      (key) => key,
    logger: { info() {}, warn() {}, error() {} },
    ...overrides,
  };
}

async function newOpenTicket() {
  const channelId = `c${nextChannel++}`;
  await db.createTicket({ channelId, guildId: GUILD, creatorId: 'u1', type: 'support' });
  return channelId;
}

test.before(async () => { await db.initDatabase(); });
test.after(async () => { await db.closeDatabase(); });

test('closeOrphanedTicket closes an open ticket and frees the user slot', async () => {
  const channelId = await newOpenTicket();
  assert.equal((await db.getOpenTicketsByUser('u1', GUILD)).some(t => t.channel_id === channelId), true);

  assert.equal(await closeOrphanedTicket(fakeClient(), channelId), true);

  const row = await db.getTicketByChannel(channelId);
  assert.equal(row.status, 'closed');
  assert.equal(row.closed_by, 'bot');
  assert.equal((await db.getOpenTicketsByUser('u1', GUILD)).some(t => t.channel_id === channelId), false);
});

test('closeOrphanedTicket ignores unknown and already closed channels', async () => {
  assert.equal(await closeOrphanedTicket(fakeClient(), 'does-not-exist'), false);
  const channelId = await newOpenTicket();
  await closeOrphanedTicket(fakeClient(), channelId);
  assert.equal(await closeOrphanedTicket(fakeClient(), channelId), false);
});

test('fetchTicketChannel closes the ticket only when Discord reports Unknown Channel', async () => {
  const gone = await newOpenTicket();
  const flaky = await newOpenTicket();

  const unknown = fakeClient({ channels: { fetch: async () => { throw Object.assign(new Error('Unknown Channel'), { code: 10003 }); } } });
  const transient = fakeClient({ channels: { fetch: async () => { throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }); } } });

  assert.equal(await fetchTicketChannel(unknown, gone), null);
  assert.equal(await fetchTicketChannel(transient, flaky), null);

  assert.equal((await db.getTicketByChannel(gone)).status, 'closed');
  assert.equal((await db.getTicketByChannel(flaky)).status, 'open');
});

test('captureFinalTranscript closes the row even when transcripts are disabled', async () => {
  const channelId = await newOpenTicket();
  const ticket = await db.getTicketByChannel(channelId);

  const url = await captureFinalTranscript(fakeClient(), { id: channelId }, ticket, { id: 'staff1' });

  assert.equal(url, null);
  const row = await db.getTicketByChannel(channelId);
  assert.equal(row.status, 'closed');
  assert.equal(row.closed_by, 'staff1');
});

test('closing an orphan keeps the transcript of an earlier close', async () => {
  const channelId = await newOpenTicket();
  await db.closeTicket(channelId, 'staff1', 'done', '<html>first close</html>');
  await db.reopenTicket(channelId);

  await closeOrphanedTicket(fakeClient(), channelId);

  const row = await db.getTicketByChannel(channelId);
  assert.equal(row.status, 'closed');
  assert.equal(row.transcript, '<html>first close</html>');
});
