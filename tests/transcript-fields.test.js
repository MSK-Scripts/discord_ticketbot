/**
 * The ticket's opening embed stores the answers to the ticket questions as
 * embed fields; the transcript has to show them (escaped), and a flood of
 * custom emoji must not turn into an unbounded number of CDN requests.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { generateTranscript } = require('../src/utils/transcript');

function collection(items) {
  const map = new Map(items.map(m => [m.id, m]));
  map.last = () => items[items.length - 1];
  return map;
}

function fakeChannel(messages) {
  return {
    name: 'ticket-1',
    guild: {
      members: { fetch: async () => { throw new Error('offline'); }, cache: new Map() },
      roles: { cache: new Map() },
      channels: { cache: new Map() },
    },
    messages: {
      fetch: async ({ before } = {}) => (before ? collection([]) : collection(messages)),
    },
  };
}

function message(id, { content = '', embeds = [] } = {}) {
  return {
    id,
    content,
    embeds,
    createdAt: new Date(0),
    attachments: new Map(),
    mentions: { users: new Map(), roles: new Map(), channels: new Map() },
    author: { id: 'u1', username: 'player', bot: false, displayAvatarURL: () => 'https://cdn.discordapp.com/a.png' },
  };
}

const ticket = { id: 1, creator_id: 'u1', created_at: 0, closed_at: 0, type: 'support' };

test('embed fields (question answers) appear in the transcript, escaped', async (t) => {
  t.mock.method(global, 'fetch', async () => { throw new Error('no network in tests'); });

  const html = await generateTranscript(fakeChannel([
    message('1', {
      embeds: [{
        title: 'Ticket opened',
        description: 'intro',
        fields: [{ name: 'What happened?', value: 'My car <script>alert(1)</script> vanished' }],
      }],
    }),
  ]), ticket, 'UCRP');

  assert.match(html, /What happened\?/);
  assert.match(html, /My car &lt;script&gt;alert\(1\)&lt;\/script&gt; vanished/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test('custom emoji fetches are capped', async (t) => {
  const fetchMock = t.mock.method(global, 'fetch', async () => { throw new Error('no network in tests'); });

  const flood = Array.from({ length: 1000 }, (_, i) => `<:e:${100000 + i}>`).join(' ');
  await generateTranscript(fakeChannel([message('1', { content: flood })]), ticket, 'UCRP');

  const emojiCalls = fetchMock.mock.calls.filter(c => String(c.arguments[0]).includes('/emojis/'));
  assert.equal(emojiCalls.length, 200);
});
