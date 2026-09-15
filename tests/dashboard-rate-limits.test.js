/**
 * Dashboard rate limits (express-rate-limit), exercised against a real Express
 * app so the middleware wiring, keys and responses are what gets tested.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createLimiters } = require('../src/dashboard/rateLimits');

async function serve(configure) {
  const app = express();
  // Stand-in for the server.js middleware that sets clientIp / auth.
  app.use((req, res, next) => {
    req.clientIp = req.headers['x-test-ip'] || '10.0.0.1';
    req.auth = { userId: req.headers['x-test-user'] || 'u1' };
    next();
  });
  configure(app);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, { method = 'GET', headers = {} } = {}) =>
    fetch(base + path, { method, headers });
  return { call, close: () => new Promise((r) => server.close(r)) };
}

test('global limit blocks per IP with 429, Retry-After and JSON', async () => {
  const limiters = createLimiters({ global: { limit: 3 } });
  const { call, close } = await serve((app) => {
    app.use(limiters.global);
    app.get('/x', (req, res) => res.json({ ok: true }));
  });
  try {
    for (let i = 0; i < 3; i++) assert.equal((await call('/x')).status, 200);
    const blocked = await call('/x');
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    assert.deepEqual(await blocked.json(), { error: 'Too many requests. Please slow down.' });
    assert.equal((await call('/x', { headers: { 'x-test-ip': '10.0.0.2' } })).status, 200,
      'another IP has its own budget');
  } finally {
    await close();
  }
});

test('health limit charges failed attempts only', async () => {
  const limiters = createLimiters({ health: { limit: 2 } });
  const { call, close } = await serve((app) => {
    app.get('/health', limiters.health, (req, res) => {
      if (req.headers['x-secret'] !== 'ok') return res.status(401).json({ error: 'Not authorised.' });
      res.json({ status: 'running' });
    });
  });
  const good = { headers: { 'x-secret': 'ok' } };
  try {
    for (let i = 0; i < 10; i++) assert.equal((await call('/health', good)).status, 200);
    assert.equal((await call('/health')).status, 401);
    assert.equal((await call('/health')).status, 401);
    assert.equal((await call('/health')).status, 429, 'budget spent by failures');
    assert.equal((await call('/health', good)).status, 429, 'a lockout also holds for the right secret');
  } finally {
    await close();
  }
});

test('write limit is per user and ignores reads', async () => {
  const limiters = createLimiters({ write: { limit: 2 } });
  const { call, close } = await serve((app) => {
    app.use(limiters.write);
    app.all('/api', (req, res) => res.json({ ok: true }));
  });
  try {
    for (let i = 0; i < 5; i++) assert.equal((await call('/api')).status, 200);
    assert.equal((await call('/api', { method: 'POST' })).status, 200);
    assert.equal((await call('/api', { method: 'POST' })).status, 200);
    const blocked = await call('/api', { method: 'POST' });
    assert.equal(blocked.status, 429);
    assert.deepEqual(await blocked.json(), { error: 'Too many changes. Please slow down.' });
    assert.equal((await call('/api', { method: 'POST', headers: { 'x-test-user': 'u2' } })).status, 200,
      'another user has their own budget');
  } finally {
    await close();
  }
});

test('login and callback share one auth budget', async () => {
  const limiters = createLimiters({ auth: { limit: 2 } });
  const { call, close } = await serve((app) => {
    app.get('/auth/login', limiters.auth, (req, res) => res.send('login'));
    app.get('/auth/callback', limiters.auth, (req, res) => res.send('callback'));
  });
  try {
    assert.equal((await call('/auth/login')).status, 200);
    assert.equal((await call('/auth/callback')).status, 200);
    const blocked = await call('/auth/login');
    assert.equal(blocked.status, 429);
    assert.equal(await blocked.text(), 'Too many login attempts. Please try again later.');
  } finally {
    await close();
  }
});
