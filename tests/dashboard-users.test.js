/**
 * User name resolution.
 *
 * The interesting part is not "does it return a name" but the boundary: the
 * fallback that resolves users OUTSIDE this guild must stay reserved for staff.
 * Without that check the dashboard would happily turn any snowflake on Discord
 * into an account name for any logged-in member.
 */

const test = require('node:test');
const assert = require('node:assert');

const { resolveUsers } = require('../src/dashboard/discord');

const GUILD = '111111111111111111';

/** Fake Discord: `members` are in the guild, `users` exist but are not. */
function stubFetch({ members = {}, users = {} }) {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    const member = String(url).match(/\/guilds\/\d+\/members\/(\d+)$/);
    if (member) {
      const found = members[member[1]];
      return found
        ? { ok: true, status: 200, text: async () => JSON.stringify(found), headers: new Map() }
        : { ok: false, status: 404, text: async () => '{}', headers: new Map() };
    }
    const user = String(url).match(/\/users\/(\d+)$/);
    if (user) {
      const found = users[user[1]];
      return found
        ? { ok: true, status: 200, text: async () => JSON.stringify(found), headers: new Map() }
        : { ok: false, status: 404, text: async () => '{}', headers: new Map() };
    }
    throw new Error(`unexpected request: ${url}`);
  };
  return calls;
}

test.beforeEach(() => { process.env.TOKEN = 'test-token'; });

test('resolves a guild member to their display name', async () => {
  const id = '200000000000000001';
  stubFetch({ members: { [id]: { user: { id, username: 'moritz', global_name: 'Moritz' } } } });

  const out = await resolveUsers(GUILD, [id]);
  assert.strictEqual(out[id].name, 'Moritz');
  assert.strictEqual(out[id].inGuild, true);
});

test('a server nickname wins over the global name', async () => {
  const id = '200000000000000002';
  stubFetch({
    members: { [id]: { nick: 'Support Lead', user: { id, username: 'moritz', global_name: 'Moritz' } } },
  });

  const out = await resolveUsers(GUILD, [id]);
  assert.strictEqual(out[id].name, 'Support Lead');
});

test('a non-member is NOT resolved for a caller without tickets.view', async () => {
  const id = '200000000000000003';
  const calls = stubFetch({ users: { [id]: { id, username: 'someone', global_name: 'Someone' } } });

  const out = await resolveUsers(GUILD, [id], { allowNonMembers: false });

  assert.strictEqual(out[id], null, 'an end user must not learn who this snowflake belongs to');
  assert.ok(
    !calls.some(u => /\/users\//.test(u)),
    'the global user endpoint must not even be called for an unprivileged caller',
  );
});

test('a non-member IS resolved for staff (a creator who left must stay identifiable)', async () => {
  const id = '200000000000000004';
  stubFetch({ users: { [id]: { id, username: 'gone', global_name: 'Gone' } } });

  const out = await resolveUsers(GUILD, [id], { allowNonMembers: true });
  assert.strictEqual(out[id].name, 'Gone');
  assert.strictEqual(out[id].inGuild, false, 'the UI marks them as having left');
});

test('a cached unprivileged miss is not served to staff', async () => {
  // Regression guard: a naive cache would store "unknown" from an end user's
  // lookup and then hand that same null back to staff, who are allowed to see it.
  const id = '200000000000000005';
  stubFetch({ users: { [id]: { id, username: 'gone', global_name: 'Gone' } } });

  const first = await resolveUsers(GUILD, [id], { allowNonMembers: false });
  assert.strictEqual(first[id], null);

  const second = await resolveUsers(GUILD, [id], { allowNonMembers: true });
  assert.strictEqual(second[id]?.name, 'Gone', 'staff must get a real lookup, not the cached miss');
});

test('a staff-resolved non-member is NOT leaked to an unprivileged caller via the cache', async () => {
  // The exact leak an earlier version had: staff resolve a user outside the guild
  // (cached as a truthy non-member value), then a permissionless member reads it
  // back through GET /api/users. The cached value must be hidden from them.
  const id = '200000000000000007';
  stubFetch({ users: { [id]: { id, username: 'outsider', global_name: 'Outsider' } } });

  const staff = await resolveUsers(GUILD, [id], { allowNonMembers: true });
  assert.strictEqual(staff[id].name, 'Outsider');

  const endUser = await resolveUsers(GUILD, [id], { allowNonMembers: false });
  assert.strictEqual(endUser[id], null, 'the non-member identity must not reach an unprivileged caller');

  // …and the cached value survives, so staff still get it afterwards.
  const staffAgain = await resolveUsers(GUILD, [id], { allowNonMembers: true });
  assert.strictEqual(staffAgain[id]?.name, 'Outsider', 'the unprivileged read must not have erased the cache');
});

test('each id is fetched once per batch, duplicates collapse', async () => {
  const id = '200000000000000006';
  const calls = stubFetch({ members: { [id]: { user: { id, username: 'dup', global_name: 'Dup' } } } });

  const out = await resolveUsers(GUILD, [id, id, id, null, '']);

  assert.strictEqual(out[id].name, 'Dup');
  assert.strictEqual(calls.length, 1, 'a ticket list full of one person must not fire N requests');
});
