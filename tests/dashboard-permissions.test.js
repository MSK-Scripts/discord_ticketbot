/**
 * Permission model tests.
 *
 * These cover the rules that decide who can do what in the dashboard. If one of
 * them breaks, someone either gets access they should not have, or the server
 * owner locks themselves out of their own server.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PERMISSIONS, isPermission, parsePermissions,
  selectAccessRows, resolvePermissions, hasPermission, checkSelfEdit,
} = require('../src/dashboard/permissions');

const roleRows = [
  { subject_type: 'role', subject_id: 'R1', permissions: '["tickets.view","tickets.act"]' },
  { subject_type: 'role', subject_id: 'R2', permissions: '["stats.view"]' },
];

test('the owner has every permission and cannot be locked out', () => {
  const perms = resolvePermissions({ isOwner: true });
  assert.equal(perms.length, PERMISSIONS.length);
  for (const p of PERMISSIONS) assert.ok(hasPermission(perms, p));
});

test('the owner keeps every permission even with a restrictive user row', () => {
  const userRow = { subject_type: 'user', subject_id: 'U1', permissions: '[]' };
  const perms = resolvePermissions({ isOwner: true, userRow, roleRows });
  assert.equal(perms.length, PERMISSIONS.length);
});

test('role permissions are unioned', () => {
  const perms = resolvePermissions({ roleRows }).sort();
  assert.deepEqual(perms, ['stats.view', 'tickets.act', 'tickets.view']);
});

test('a user row OVERRIDES role rows instead of adding to them', () => {
  // This is the core rule: an explicit user entry is the final word, which is
  // what makes it possible to REVOKE a permission a role grants.
  const userRow = { subject_type: 'user', subject_id: 'U1', permissions: '["tickets.view"]' };
  const perms = resolvePermissions({ userRow, roleRows });

  assert.deepEqual(perms, ['tickets.view']);
  assert.ok(!hasPermission(perms, 'tickets.act'), 'role-granted permission must be revoked');
  assert.ok(!hasPermission(perms, 'stats.view'));
});

test('no matching row means no permissions at all', () => {
  assert.deepEqual(resolvePermissions({}), []);
  assert.deepEqual(resolvePermissions({ roleRows: [] }), []);
});

test('an unknown permission in the DB is filtered out', () => {
  // A permission removed from the code must never come back to life through a
  // stale row that still lists it.
  assert.deepEqual(parsePermissions('["tickets.view","evil.superuser"]'), ['tickets.view']);
  assert.deepEqual(parsePermissions('not json'), []);
  assert.deepEqual(parsePermissions(null), []);
  assert.deepEqual(parsePermissions(42), []);
  assert.deepEqual(parsePermissions(['stats.view', 123]), ['stats.view']);
});

test('isPermission only accepts permissions that exist', () => {
  assert.ok(isPermission('tickets.view'));
  assert.ok(!isPermission('tickets.destroy'));
  assert.ok(!isPermission(null));
  assert.ok(!isPermission(1));
});

test('selectAccessRows picks the user row and only the matching roles', () => {
  const userRow = { subject_type: 'user', subject_id: 'U1', permissions: '[]' };
  const { userRow: u, roleRows: r } = selectAccessRows([userRow, ...roleRows], 'U1', ['R1']);
  assert.equal(u, userRow);
  assert.equal(r.length, 1);
  assert.equal(r[0].subject_id, 'R1');
});

test('hasPermission with an array means any-of', () => {
  assert.ok(hasPermission(['stats.view'], ['config.edit', 'stats.view']));
  assert.ok(!hasPermission(['stats.view'], ['config.edit', 'bot.control']));
});

// ── Self-edit guards ─────────────────────────────────────────────────────────

const actor = {
  actorId: 'U1',
  actorIsOwner: false,
  actorPermissions: ['access.manage', 'tickets.view'],
  targetType: 'user',
  targetId: 'U1',
};

test('you cannot remove your own access.manage permission', () => {
  const err = checkSelfEdit({ ...actor, nextPermissions: ['tickets.view'], nextActive: true });
  assert.match(err, /Manage permissions/);
});

test('you cannot deactivate your own access', () => {
  const err = checkSelfEdit({ ...actor, nextPermissions: ['access.manage'], nextActive: false });
  assert.match(err, /deactivate/);
});

test('you cannot grant yourself permissions you do not have', () => {
  const err = checkSelfEdit({
    ...actor,
    nextPermissions: ['access.manage', 'bot.control'],
    nextActive: true,
  });
  assert.match(err, /additional permissions/);
});

test('a valid self-edit is allowed', () => {
  assert.equal(
    checkSelfEdit({ ...actor, nextPermissions: ['access.manage', 'tickets.view'], nextActive: true }),
    null,
  );
});

test('granting permissions to SOMEONE ELSE is not restricted', () => {
  // Separation of duties: the guards only exist to stop self-escalation and
  // self-lockout. Handing permissions you hold to another person stays allowed.
  assert.equal(
    checkSelfEdit({ ...actor, targetId: 'U2', nextPermissions: ['tickets.view'], nextActive: true }),
    null,
  );
});
