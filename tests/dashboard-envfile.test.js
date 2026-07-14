/**
 * .env patching tests.
 *
 * Regression guard for a real bug: with Windows (CRLF) line endings the patcher
 * failed to recognise existing keys and APPENDED duplicates instead of updating
 * them. In JS regex, `.` does not match '\r' and `$` does not match before it,
 * so a pattern ending in `(.*)$` silently fails on every line of a CRLF file.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseEnvFile, setEnvValue, dedupeEnv } = require('../src/dashboard/envFile');

const LF   = 'TOKEN="abc"\n# a comment\nCLIENT_ID="123"\n';
const CRLF = 'TOKEN="abc"\r\n# a comment\r\nCLIENT_ID="123"\r\n';

const keyCount = (content, key) =>
  content.split(/\r?\n/).filter(l => new RegExp(`^\\s*${key}\\s*=`).test(l)).length;

for (const [name, content] of [['LF', LF], ['CRLF', CRLF]]) {
  test(`[${name}] an existing key is UPDATED, not duplicated`, () => {
    const out = setEnvValue(content, 'CLIENT_ID', '999');
    assert.equal(keyCount(out, 'CLIENT_ID'), 1, 'the key must appear exactly once');
    assert.equal(parseEnvFile(out).get('CLIENT_ID').value, '999');
  });

  test(`[${name}] a missing key is appended exactly once`, () => {
    const out = setEnvValue(content, 'NEW_KEY', 'v');
    assert.equal(keyCount(out, 'NEW_KEY'), 1);
    assert.equal(parseEnvFile(out).get('NEW_KEY').value, 'v');
  });

  test(`[${name}] comments and unrelated keys survive`, () => {
    const out = setEnvValue(content, 'CLIENT_ID', '999');
    assert.ok(out.includes('# a comment'));
    assert.equal(parseEnvFile(out).get('TOKEN').value, 'abc');
  });

  test(`[${name}] the original line ending is preserved`, () => {
    const out = setEnvValue(content, 'CLIENT_ID', '999');
    assert.equal(out.includes('\r\n'), name === 'CRLF');
  });

  test(`[${name}] repeated writes never accumulate duplicates`, () => {
    let out = content;
    for (let i = 0; i < 5; i++) out = setEnvValue(out, 'DASHBOARD_ENABLED', 'true');
    assert.equal(keyCount(out, 'DASHBOARD_ENABLED'), 1);
  });
}

test('values are escaped so they cannot break out of the quotes', () => {
  const out = setEnvValue(LF, 'X', 'he said "hi" \\');
  assert.equal(parseEnvFile(out).get('X').value, 'he said "hi" \\');
  assert.equal(keyCount(out, 'X'), 1);
});

test('commented-out keys are not treated as real keys', () => {
  const out = setEnvValue('# CLIENT_SECRET=""\n', 'CLIENT_SECRET', 's');
  assert.equal(keyCount(out, 'CLIENT_SECRET'), 1);
  assert.ok(out.includes('# CLIENT_SECRET=""'), 'the comment must stay intact');
});

test('dedupeEnv collapses duplicates, keeping the first position and the last value', () => {
  // This is the exact shape a .env ended up in after the CRLF bug.
  const broken =
    'DASHBOARD_ENABLED="false"\r\n' +
    'TOKEN="abc"\r\n' +
    'DASHBOARD_ENABLED="true"\r\n';

  const { content, removed } = dedupeEnv(broken);

  assert.deepEqual(removed, ['DASHBOARD_ENABLED']);
  assert.equal(keyCount(content, 'DASHBOARD_ENABLED'), 1);
  // dotenv resolves duplicates to the LAST value, so that is the one to keep…
  assert.equal(parseEnvFile(content).get('DASHBOARD_ENABLED').value, 'true');
  // …but at the FIRST position, so the file's documented layout survives.
  assert.ok(content.indexOf('DASHBOARD_ENABLED') < content.indexOf('TOKEN'));
});

test('dedupeEnv leaves a clean file untouched', () => {
  const { removed } = dedupeEnv(LF);
  assert.deepEqual(removed, []);
});
