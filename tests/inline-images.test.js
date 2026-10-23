/**
 * Without an API key the transcript is a standalone file, so its images are
 * embedded: the Discord CDN links expire, and with deleteOnClose they die with
 * the channel seconds after the close.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = 'sqlite::memory:';
const { collectInlineImages } = require('../src/utils/ticketActions');

const MB = 1024 * 1024;
const client = { logger: { info() {}, warn() {}, error() {}, debug() {} } };

function batchOf(messages) {
  const map = new Map(messages.map(m => [m.id, m]));
  return { size: map.size, values: () => map.values(), last: () => messages[messages.length - 1] };
}

function message(id, attachments) {
  return { id, attachments: new Map(attachments.map(a => [a.id, a])) };
}

function channelWith(messages) {
  return { messages: { fetch: async () => batchOf(messages) } };
}

test('images are embedded as data URIs, other files are left alone', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(Buffer.from('PNGDATA')));
  const channel = channelWith([
    message('m1', [
      { id: 'a1', name: 'shot.png',  contentType: 'image/png', size: 7, url: 'https://cdn/a1' },
      { id: 'a2', name: 'log.txt',   contentType: 'text/plain; charset=utf-8', size: 7, url: 'https://cdn/a2' },
      { id: 'a3', name: 'icon.svg',  contentType: 'image/svg+xml', size: 7, url: 'https://cdn/a3' },
    ]),
  ]);

  const images = await collectInlineImages(channel, client);

  assert.equal(images.get('a1'), `data:image/png;base64,${Buffer.from('PNGDATA').toString('base64')}`);
  assert.equal(images.has('a2'), false);
  assert.equal(images.has('a3'), false);
});

test('the image budget keeps the transcript small enough to post', async (t) => {
  const big = Buffer.alloc(3 * MB);
  t.mock.method(globalThis, 'fetch', async () => new Response(big));
  // Newest first, as Discord returns them: the two oldest images fit.
  const channel = channelWith([
    message('m3', [{ id: 'new', name: 'c.jpg', contentType: 'image/jpeg', size: 3 * MB, url: 'https://cdn/c' }]),
    message('m2', [{ id: 'mid', name: 'b.jpg', contentType: 'image/jpeg', size: 1 * MB, url: 'https://cdn/b' }]),
    message('m1', [{ id: 'old', name: 'a.jpg', contentType: 'image/jpeg', size: 3 * MB, url: 'https://cdn/a' }]),
  ]);

  const images = await collectInlineImages(channel, client);

  // 'old' (3 MB) fits; 'mid' reports 1 MB but downloads 3 MB, which would pass
  // 5 MB, so the measured size wins; 'new' is over budget by its reported size.
  assert.deepEqual([...images.keys()], ['old']);
});

test('a failed download does not stop the others', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/bad')) throw new Error('timeout');
    return new Response(Buffer.from('GIF'));
  });
  const channel = channelWith([
    message('m1', [
      { id: 'bad',  name: 'x.gif', contentType: 'image/gif', size: 3, url: 'https://cdn/bad' },
      { id: 'good', name: 'y.gif', contentType: 'image/gif', size: 3, url: 'https://cdn/good' },
    ]),
  ]);

  const images = await collectInlineImages(channel, client);

  assert.deepEqual([...images.keys()], ['good']);
});
