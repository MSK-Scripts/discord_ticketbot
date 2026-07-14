/**
 * Bridge guard tests.
 *
 * A closed ticket is read-only. The status check was originally missing from
 * priority, lock, move and unclaim, so a closed ticket could still be
 * re-prioritised or moved from the dashboard. The rule now lives in ONE place
 * and is applied before dispatch, so a handler cannot forget it.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertMutable, ALLOWED_WHEN_CLOSED, sanitizeUserText,
  ZERO_PING, MAX_MESSAGE_LENGTH,
} = require('../src/dashboard/botBridge');

const open   = { id: 1, status: 'open',   locked: 0 };
const closed = { id: 2, status: 'closed', locked: 0 };

const MUTATIONS = [
  'ticket.priority', 'ticket.lock', 'ticket.move',
  'ticket.claim', 'ticket.unclaim', 'ticket.close', 'ticket.reply',
];

test('every mutation is allowed on an OPEN ticket', () => {
  for (const action of [...MUTATIONS, 'ticket.reopen']) {
    assert.equal(assertMutable(action, open), null, `${action} should be allowed`);
  }
});

test('every mutation is BLOCKED on a closed ticket', () => {
  for (const action of MUTATIONS) {
    const problem = assertMutable(action, closed);
    assert.ok(problem, `${action} must be blocked on a closed ticket`);
    assert.match(problem, /closed/i);
  }
});

test('reopen is the ONLY action allowed on a closed ticket', () => {
  assert.equal(assertMutable('ticket.reopen', closed), null);
  assert.deepEqual([...ALLOWED_WHEN_CLOSED], ['ticket.reopen']);
});

test('a missing ticket is rejected', () => {
  assert.match(assertMutable('ticket.close', null), /not found/i);
  assert.match(assertMutable('ticket.close', undefined), /not found/i);
});

test('an unknown future action is blocked on a closed ticket by default', () => {
  // The gate is a deny-list of exceptions, not an allow-list of mutations — so a
  // new action added later is automatically covered instead of silently exempt.
  assert.ok(assertMutable('ticket.somethingNew', closed));
});

// ── User text sanitising (the reply path) ───────────────────────────────────

test('masked links are neutralised (the phishing vector)', () => {
  // discord.js does NOT escape masked links by default — `maskedLink` must be
  // switched on explicitly. Without it, `[Free Nitro](https://evil)` reaches the
  // channel as a real clickable link, posted under someone ELSE'S name via the
  // webhook. That is exactly the attack this guards against.
  const out = sanitizeUserText('[Free Nitro](https://evil.example/phish)');

  assert.ok(out.startsWith('\\['), 'the opening bracket must be escaped');
  assert.ok(!/(^|[^\\])\[Free Nitro\]\(/.test(out), 'an unescaped masked link must not survive');
  // The URL itself may remain visible — that is fine and honest: the reader sees
  // the real destination instead of a disguised one.
  assert.ok(out.includes('evil.example'));
});

test('headings and lists from untrusted text are escaped', () => {
  assert.ok(sanitizeUserText('# SHOUTING').startsWith('\\#'));
  assert.ok(sanitizeUserText('- item').startsWith('\\-'));
});

test('bold/code markdown is escaped (the discord.js defaults)', () => {
  const out = sanitizeUserText('**bold** and `code`');
  assert.ok(out.includes('\\*\\*'));
  assert.ok(out.includes('\\`'));
});

test('text is truncated to Discord\'s 2000 character limit', () => {
  assert.equal(sanitizeUserText('a'.repeat(5000)).length, MAX_MESSAGE_LENGTH);
});

test('empty input yields null rather than an empty message', () => {
  assert.equal(sanitizeUserText('   '), null);
  assert.equal(sanitizeUserText(''), null);
  assert.equal(sanitizeUserText(null), null);
});

test('the zero-ping policy blocks every mention type', () => {
  // Filtering the string for "@everyone" would be useless: <@&id> and <@id>
  // bypass any text filter. allowed_mentions is the only reliable gate.
  assert.deepEqual(ZERO_PING.parse, []);
  assert.deepEqual(ZERO_PING.roles, []);
  assert.deepEqual(ZERO_PING.users, []);
  assert.equal(ZERO_PING.repliedUser, false);
});
