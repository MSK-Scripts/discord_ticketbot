/**
 * Close, lock and reopen apply to every non-staff participant, not only to the
 * ticket creator: users added with /add used to keep reading (and writing in)
 * a closed or locked ticket.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { OverwriteType } = require('discord.js');

const { editParticipantAccess } = require('../src/utils/ticketActions');

function setup() {
  const edits = new Map();
  const overwrites = new Map([
    ['everyone', { id: 'everyone', type: OverwriteType.Role }],
    ['staffRole', { id: 'staffRole', type: OverwriteType.Role }],
    ['creator', { id: 'creator', type: OverwriteType.Member }],
    ['guest', { id: 'guest', type: OverwriteType.Member }],
    ['helper', { id: 'helper', type: OverwriteType.Member }],
    ['bot', { id: 'bot', type: OverwriteType.Member }],
  ]);
  const members = {
    guest:  { roles: ['member'] },
    helper: { roles: ['staffRole'] },
  };

  const channel = {
    guild: {
      members: {
        fetch: async (id) => ({
          permissions: { has: () => false },
          roles: { cache: new Set(members[id]?.roles ?? []) },
        }),
      },
    },
    permissionOverwrites: {
      cache: overwrites,
      edit: async (id, perms) => { edits.set(id, perms); },
    },
  };
  const client = {
    user: { id: 'bot' },
    logger: { warn() {} },
    ticketTypeOf: () => null,
    isStaff: (member) => member.roles.cache.has('staffRole'),
  };
  return { channel, client, edits };
}

test('the creator and /add-ed non-staff users are changed; staff, roles and the bot are not', async () => {
  const { channel, client, edits } = setup();
  const perms = { ViewChannel: false, SendMessages: false };

  await editParticipantAccess(client, channel, { creator_id: 'creator', type: 'support' }, perms);

  assert.deepEqual([...edits.keys()].sort(), ['creator', 'guest']);
  assert.deepEqual(edits.get('guest'), perms);
});

test('the creator is changed even without an existing overwrite', async () => {
  const { channel, client, edits } = setup();
  channel.permissionOverwrites.cache.delete('creator');

  await editParticipantAccess(client, channel, { creator_id: 'creator', type: 'support' }, { SendMessages: true });

  assert.equal(edits.has('creator'), true);
});
