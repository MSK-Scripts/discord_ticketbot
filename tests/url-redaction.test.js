/**
 * Database URLs never reach logs or error messages with their password.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { redactUrl, parseDatabaseUrl } = require('../src/database/url');

test('redactUrl masks the password and nothing else', () => {
  assert.equal(redactUrl('postgres://bot:s3cr%40t@127.0.0.1:5432/tickets'), 'postgres://bot:***@127.0.0.1:5432/tickets');
  assert.equal(redactUrl('postgres://bot:pa/ss@host/db'), 'postgres://bot:***@host/db');
  assert.equal(redactUrl('postgres://host:5432/db'), 'postgres://host:5432/db');
  assert.equal(redactUrl('sqlite:./data/tickets.db'), 'sqlite:./data/tickets.db');
});

test('redactUrl masks a password containing an unencoded @', () => {
  assert.equal(redactUrl('postgres://bot:p@ss@host/db'), 'postgres://bot:***@host/db');
});

test('a malformed DATABASE_URL error does not contain the password', () => {
  assert.throws(
    () => parseDatabaseUrl('postgres://bot:hunter2@'),
    (err) => !err.message.includes('hunter2'),
  );
});
