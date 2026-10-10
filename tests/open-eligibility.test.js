/**
 * Every open path goes through getOpenRefusal / openTicket, so these checks are
 * what actually stands between a member and a new ticket channel.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = 'sqlite::memory:';
const db = require('../src/database');
const { getOpenRefusal, openTicket } = require('../src/utils/ticketActions');

const GUILD = 'g1';

function fakeMember(id, roles = []) {
  return { id, guild: { id: GUILD }, roles: { cache: new Set(roles) } };
}

function fakeClient(config = {}) {
  return {
    config: { maxTicketOpened: 1, rolesWhoCanNotCreateTickets: [], ...config },
    t: (key) => key,
    logger: { info() {}, warn() {}, error() {} },
  };
}

test.before(async () => { await db.initDatabase(); });
test.after(async () => { await db.closeDatabase(); });

test('a member with no restrictions may open', async () => {
  assert.equal(await getOpenRefusal(fakeClient(), fakeMember('free'), { cantAccess: [] }), null);
});

test('blacklisted members are refused', async () => {
  await db.addToBlacklist({ userId: 'banned', guildId: GUILD, reason: 'x', addedBy: 'staff' });
  const refusal = await getOpenRefusal(fakeClient(), fakeMember('banned'), null);
  assert.equal(refusal.key, 'messages.blacklisted');
});

test('rolesWhoCanNotCreateTickets is enforced', async () => {
  const client = fakeClient({ rolesWhoCanNotCreateTickets: ['muted'] });
  const refusal = await getOpenRefusal(client, fakeMember('m1', ['muted']), null);
  assert.equal(refusal.key, 'messages.cannotCreateTickets');
});

test('cantAccess is enforced once a type is known', async () => {
  const type = { codeName: 'staff', cantAccess: ['civilian'] };
  assert.equal(await getOpenRefusal(fakeClient(), fakeMember('m2', ['civilian']), null), null);
  const refusal = await getOpenRefusal(fakeClient(), fakeMember('m2', ['civilian']), type);
  assert.equal(refusal.key, 'messages.noAccessToType');
});

test('the open-ticket limit is enforced', async () => {
  await db.createTicket({ channelId: 'lim1', guildId: GUILD, creatorId: 'busy', type: 'support' });
  const refusal = await getOpenRefusal(fakeClient({ maxTicketOpened: 1 }), fakeMember('busy'), null);
  assert.equal(refusal.key, 'messages.ticketLimitReached');
  assert.deepEqual(refusal.vars, { limit: '1' });
});

test('concurrent opens by one user create only one ticket', async () => {
  let created = 0;
  let releaseCreate;
  const createGate = new Promise(resolve => { releaseCreate = resolve; });

  const guild = {
    id: GUILD,
    roles: { everyone: 'everyone', cache: new Set() },
    members: { fetch: async (id) => fakeMember(id) },
    channels: {
      // Hold the first creation open so the second call overlaps it.
      create: async () => {
        created++;
        await createGate;
        return { id: `race-${created}`, send: async () => null, setTopic: async () => null };
      },
    },
  };
  const client = { ...fakeClient({ maxTicketOpened: 1, ticketTypes: [] }), locale: {}, t: (k) => k };
  const type = { codeName: 'support', cantAccess: [], staffRoles: [] };
  const user = { id: 'racer', username: 'racer' };

  const first  = openTicket(client, guild, user, type, []);
  const second = await openTicket(client, guild, user, type, []);
  releaseCreate();
  await first.catch(() => null); // the embed builder may need more client state; creation count is what matters

  assert.equal(second.channel, null);
  assert.equal(second.refusal.key, 'messages.ticketOpenInProgress');
  assert.equal(created, 1);
});
