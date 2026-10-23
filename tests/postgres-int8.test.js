/**
 * pg returns BIGINT as a string. The timestamps are BIGINT, and a string
 * timestamp is an Invalid Date (every transcript failed on PostgreSQL), so the
 * driver's pool parses int8 as a number. No server needed: pg is replaced
 * with a fake that records the pool config.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const realPg = require('pg');
let poolConfig;
class FakePool {
  constructor(config) { poolConfig = config; }
  on() {}
  async connect() { return { release() {} }; }
}
require.cache[require.resolve('pg')].exports = { ...realPg, Pool: FakePool };

const { createPostgresDriver } = require('../src/database/drivers/postgres');

test('BIGINT (int8) comes back as a number, other types are unchanged', async () => {
  await createPostgresDriver({ options: {} }).connect();

  const parse = (oid) => poolConfig.types.getTypeParser(oid, 'text');
  assert.equal(parse(20)('1792781224429'), 1792781224429);
  assert.ok(!Number.isNaN(new Date(parse(20)('1792781224429')).getTime()));
  // NUMERIC (AVG results) and TEXT keep pg's defaults.
  assert.equal(parse(1700)('4.50'), '4.50');
  assert.equal(parse(25)('1558357487801999400'), '1558357487801999400');
});
