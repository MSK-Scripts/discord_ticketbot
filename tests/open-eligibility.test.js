/**
 * Every open path goes through getOpenRefusal / openTicket, so these checks are
 * what actually stands between a member and a new ticket channel.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = 'sqlite::memory:';
const db = require('../src/database');
const { getOpenRefusal, openTicket } = require('../src/utils/ticketActions');
const openButton = require('../src/components/buttons/openTicket');

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

test('a type without requiredRoles is open to everyone', async () => {
  const type = { codeName: 'order', cantAccess: [] };
  assert.equal(await getOpenRefusal(fakeClient(), fakeMember('r1'), type), null);
  assert.equal(await getOpenRefusal(fakeClient(), fakeMember('r1'), { ...type, requiredRoles: [] }), null);
});

test('requiredRoles admits a member with at least one of the roles', async () => {
  const type = { codeName: 'scripts', cantAccess: [], requiredRoles: ['sponsor', 'partner'] };
  assert.equal(await getOpenRefusal(fakeClient(), fakeMember('r2', ['partner']), type), null);
});

test('requiredRoles refuses a member with none of the roles', async () => {
  const type = { codeName: 'scripts', cantAccess: [], requiredRoles: ['sponsor'] };
  const refusal = await getOpenRefusal(fakeClient(), fakeMember('r3', ['member']), type);
  assert.equal(refusal.key, 'messages.requiredRoleMissing');
  // Before a type is picked the allow list does not apply yet.
  assert.equal(await getOpenRefusal(fakeClient(), fakeMember('r3', ['member']), null), null);
});

test('cantAccess wins over requiredRoles', async () => {
  const type = { codeName: 'scripts', cantAccess: ['muted'], requiredRoles: ['sponsor'] };
  // Holding a required role does not lift the block list ...
  const withRole = await getOpenRefusal(fakeClient(), fakeMember('r4', ['sponsor', 'muted']), type);
  assert.equal(withRole.key, 'messages.noAccessToType');
  // ... and when both apply, the block list message is the one shown.
  const withoutRole = await getOpenRefusal(fakeClient(), fakeMember('r5', ['muted']), type);
  assert.equal(withoutRole.key, 'messages.noAccessToType');
});

// ── Panel button: the ephemeral type list only offers types the member may open

function fakeButtonInteraction(member) {
  const calls = {};
  return {
    calls,
    user: { id: member.id, username: member.id },
    member,
    guild: member.guild,
    reply:     async (payload) => { calls.reply = payload; },
    showModal: async (modal)   => { calls.modal = modal; },
  };
}

const PANEL_TYPES = [
  { codeName: 'scripts', name: 'Script support', description: 'Help with a script', cantAccess: [], requiredRoles: ['sponsor'],
    askQuestions: true, questions: [{ label: 'Script', style: 'SHORT' }] },
  { codeName: 'order', name: 'Order', description: 'Order questions', cantAccess: [], requiredRoles: [],
    askQuestions: true, questions: [{ label: 'Order id', style: 'SHORT' }] },
];

test('panel button lists every type to a member who may open them all', async () => {
  const client = fakeClient({ ticketTypes: PANEL_TYPES });
  const ia = fakeButtonInteraction(fakeMember('b1', ['sponsor']));
  await openButton.execute(client, ia);
  const options = ia.calls.reply.components[0].components[0].options.map(o => o.data.value);
  assert.deepEqual(options, ['scripts', 'order']);
});

test('panel button skips hidden types and takes the single-type path for the rest', async () => {
  const client = fakeClient({ ticketTypes: PANEL_TYPES });
  const ia = fakeButtonInteraction(fakeMember('b2'));
  await openButton.execute(client, ia);
  assert.equal(ia.calls.reply, undefined);
  assert.equal(ia.calls.modal.data.custom_id, 'tb_modalQuestions:order');
});

test('panel button refuses when no type is left', async () => {
  const client = fakeClient({ ticketTypes: [PANEL_TYPES[0]] });
  const ia = fakeButtonInteraction(fakeMember('b3'));
  await openButton.execute(client, ia);
  assert.equal(ia.calls.modal, undefined);
  assert.equal(ia.calls.reply.content, 'messages.requiredRoleMissing');
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
  const client = { ...fakeClient({ maxTicketOpened: 1, ticketTypes: [] }), locale: {}, t: (k) => k, user: { id: 'bot' } };
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
