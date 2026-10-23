/**
 * Only the ticket creator may rate a ticket.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = 'sqlite::memory:';
const db = require('../src/database');
const rateButton = require('../src/components/buttons/rateTicket');

const GUILD = 'g1';

test.before(async () => { await db.initDatabase(); });
test.after(async () => { await db.closeDatabase(); });

function interaction(userId, ticketId) {
  const calls = { reply: [], modal: 0 };
  return {
    calls,
    customId: `tb_rate:5:${ticketId}`,
    user: { id: userId },
    reply: async (payload) => { calls.reply.push(payload); },
    showModal: async () => { calls.modal++; },
  };
}

const client = { t: (key) => key };

test('the creator gets the rating modal', async () => {
  await db.createTicket({ channelId: 'r1', guildId: GUILD, creatorId: 'creator', type: 'support' });
  const ticket = await db.getTicketByChannel('r1');

  const i = interaction('creator', ticket.id);
  await rateButton.execute(client, i);

  assert.equal(i.calls.modal, 1);
  assert.equal(i.calls.reply.length, 0);
});

test('anyone else is refused', async () => {
  await db.createTicket({ channelId: 'r2', guildId: GUILD, creatorId: 'creator', type: 'support' });
  const ticket = await db.getTicketByChannel('r2');

  const i = interaction('staffer', ticket.id);
  await rateButton.execute(client, i);

  assert.equal(i.calls.modal, 0);
  assert.equal(i.calls.reply[0].content, 'messages.onlyCreatorCanRate');
});
