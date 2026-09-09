/**
 * What the dashboard does when the bot is not on the guild.
 *
 * Regression guard for a real dead end (09.09.2026): a customer created the
 * application but had not invited the bot yet. Discord answers 404 Unknown Guild
 * for GET /guilds/<id>, getGuild had no branch for that — unlike getGuildMember,
 * which has always handled its own 404 — so the exception travelled up through
 * requireAuth and EVERY dashboard request answered 500. The customer's log was
 * full of stack traces that named neither the cause nor the fix.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

// request() reads the bot token from the environment and refuses without one.
process.env.TOKEN = process.env.TOKEN || 'test-token';

const { resolveMemberContext } = require('../src/dashboard/discord');

const GUILD = '1512390228546162738';
const USER  = '349274318073823233';

/** Replace global fetch with one that answers per path. */
function withFetch(handler, run) {
  const original = global.fetch;
  global.fetch = async (url) => {
    const path = String(url).replace('https://discord.com/api/v10', '');
    const { status, body } = handler(path);
    return {
      ok: status < 300,
      status,
      headers: new Map(),
      text: async () => JSON.stringify(body ?? {}),
    };
  };
  return run().finally(() => { global.fetch = original; });
}

test('an uninvited bot is reported, not thrown', async () => {
  await withFetch(
    () => ({ status: 404, body: { message: 'Unknown Guild', code: 10004 } }),
    async () => {
      const ctx = await resolveMemberContext(GUILD, USER);
      assert.equal(ctx.botInGuild, false);
      assert.equal(ctx.inGuild, false);
      assert.equal(ctx.isOwner, false);
      assert.deepEqual(ctx.roleIds, []);
    },
  );
});

test('a guild the bot IS on resolves normally', async () => {
  await withFetch(
    (path) => path.endsWith(`/members/${USER}`)
      ? { status: 200, body: { roles: ['1'.repeat(18)], nick: 'Mo' } }
      : { status: 200, body: { owner_id: USER } },
    async () => {
      const ctx = await resolveMemberContext(GUILD, USER);
      assert.equal(ctx.botInGuild, true);
      assert.equal(ctx.inGuild, true);
      assert.equal(ctx.isOwner, true);
      assert.equal(ctx.nickname, 'Mo');
    },
  );
});

test('the bot is on the guild but the user is not — still not a bot problem', async () => {
  await withFetch(
    (path) => path.endsWith(`/members/${USER}`)
      ? { status: 404, body: { message: 'Unknown Member' } }
      : { status: 200, body: { owner_id: '9'.repeat(18) } },
    async () => {
      const ctx = await resolveMemberContext(GUILD, USER);
      assert.equal(ctx.botInGuild, true, 'must not be confused with the bot missing');
      assert.equal(ctx.inGuild, false);
    },
  );
});

test('a real API failure is still thrown — silence would hide an outage', async () => {
  await withFetch(
    () => ({ status: 500, body: { message: 'Internal Server Error' } }),
    async () => {
      await assert.rejects(() => resolveMemberContext(GUILD, USER), /500/);
    },
  );
});
