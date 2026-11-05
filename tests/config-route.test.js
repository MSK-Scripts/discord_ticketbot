'use strict';

// The bot config editor reads config/*.jsonc and .env through GET /config/:file.
// PR #46 accidentally routed that read through the locale loader, so every file
// answered 404 and the editor stayed empty.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { registerRoutes } = require('../src/dashboard/routes');

const SNIPPETS = path.resolve(__dirname, '../config/snippets.jsonc');

test('GET /config/snippets returns the file content', async (t) => {
  // Use the local snippets file if there is one; otherwise create it ('wx' fails
  // instead of overwriting if it appeared in between) and remove it afterwards.
  let original = '// test snippets\n{}\n';
  let created = false;
  try {
    fs.writeFileSync(SNIPPETS, original, { encoding: 'utf-8', flag: 'wx' });
    created = true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    original = fs.readFileSync(SNIPPETS, 'utf-8');
  }
  t.after(() => { if (created) fs.rmSync(SNIPPETS, { force: true }); });

  const app = express();
  const api = express.Router();
  app.use((req, _res, next) => { req.auth = { isOwner: true, userId: '1' }; next(); });
  registerRoutes(api, { config: { guildId: '1' }, supervisor: {}, requirePermission: () => (_req, _res, next) => next(), invalidateMemberCache: () => {} });
  app.use('/api', api);
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  t.after(() => server.close());

  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/config/snippets`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { content: original });
});
