/**
 * Dashboard permission model.
 *
 * Pure logic — no DB, no Discord, no Express. That keeps it trivially testable
 * and lets the frontend import the same permission list.
 *
 * Resolution order for one member (see resolvePermissions):
 *   1. The guild owner always has EVERY permission and can never be locked out.
 *   2. An explicit 'user' row OVERRIDES all role rows. This is the whole point of
 *      the user/role split: it lets you revoke a single permission from one staff
 *      member that their role would otherwise grant.
 *   3. Otherwise: the union of the permissions of all matching 'role' rows.
 *   4. No matching row at all: no permissions (the "sees only their own tickets"
 *      case of the end-user portal).
 */

/** The complete set of permissions. Frozen: the DB is never allowed to widen it. */
const PERMISSIONS = Object.freeze([
  'tickets.view',     // see ticket list + detail
  'tickets.act',      // claim / close / reopen / priority / move / lock
  'tickets.reply',    // write into a ticket channel from the dashboard
  'stats.view',       // server + team statistics
  'config.view',      // read config.jsonc / snippets / .env
  'config.edit',      // write them
  'settings.view',    // read the dashboard appearance (accent + favicon)
  'settings.edit',    // change the dashboard appearance
  'bot.control',      // start / stop / restart / update the bot process
  'blacklist.manage', // add / remove blacklisted users
  'access.manage',    // manage dashboard permissions themselves
]);

/** UI labels. Kept next to the list so a new permission without a label is obvious. */
const PERMISSION_LABELS = Object.freeze({
  'tickets.view':     { en: 'View tickets',        de: 'Tickets ansehen' },
  'tickets.act':      { en: 'Act on tickets',      de: 'Tickets bearbeiten' },
  'tickets.reply':    { en: 'Reply in tickets',    de: 'In Tickets antworten' },
  'stats.view':       { en: 'View statistics',     de: 'Statistiken ansehen' },
  'config.view':      { en: 'View configuration',  de: 'Konfiguration ansehen' },
  'config.edit':      { en: 'Edit configuration',  de: 'Konfiguration bearbeiten' },
  'settings.view':    { en: 'View dashboard settings', de: 'Dashboard-Einstellungen ansehen' },
  'settings.edit':    { en: 'Edit dashboard settings', de: 'Dashboard-Einstellungen bearbeiten' },
  'bot.control':      { en: 'Control the bot',     de: 'Bot steuern' },
  'blacklist.manage': { en: 'Manage blacklist',    de: 'Blacklist verwalten' },
  'access.manage':    { en: 'Manage permissions',  de: 'Rechte verwalten' },
});

const SUBJECT_TYPES = Object.freeze(['user', 'role']);

/** @returns {boolean} true only for a permission that currently exists in the code. */
function isPermission(value) {
  return typeof value === 'string' && PERMISSIONS.includes(value);
}

function isSubjectType(value) {
  return typeof value === 'string' && SUBJECT_TYPES.includes(value);
}

/**
 * Parse a `permissions` column into a clean permission array.
 *
 * Accepts a JS array (some drivers hand back parsed JSON) or a JSON string.
 * Unknown entries are dropped — so a permission that was removed from the code
 * can never come back to life through a stale row that still lists it.
 *
 * @param {unknown} raw
 * @returns {string[]}
 */
function parsePermissions(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter(isPermission);
}

/**
 * Pick the rows relevant to one member out of a guild's access rows.
 * @param {Array<object>} rows      rows from getDashboardAccess()
 * @param {string} userId
 * @param {string[]} roleIds        the member's Discord role ids
 */
function selectAccessRows(rows, userId, roleIds) {
  const list = Array.isArray(rows) ? rows : [];
  const ids = Array.isArray(roleIds) ? roleIds : [];
  return {
    userRow: list.find(r => r.subject_type === 'user' && r.subject_id === userId) ?? null,
    roleRows: list.filter(r => r.subject_type === 'role' && ids.includes(r.subject_id)),
  };
}

/**
 * The effective permissions of a member. See the module header for the order.
 * @param {{ isOwner?: boolean, userRow?: object|null, roleRows?: Array<object> }} input
 * @returns {string[]}
 */
function resolvePermissions({ isOwner = false, userRow = null, roleRows = [] } = {}) {
  // 1. Owner: everything, always. Never derived from the DB, so no row (or a
  //    missing row) can ever lock the owner out of their own server.
  if (isOwner) return [...PERMISSIONS];

  // 2. An explicit user row is the final word — it replaces role permissions
  //    rather than adding to them, which is what makes targeted revocation work.
  if (userRow) return parsePermissions(userRow.permissions);

  // 3. Union over all matching role rows.
  const set = new Set();
  for (const row of roleRows) {
    for (const p of parsePermissions(row.permissions)) set.add(p);
  }
  return [...set];
}

/** @returns {boolean} */
function hasPermission(permissions, required) {
  const list = Array.isArray(permissions) ? permissions : [];
  if (Array.isArray(required)) return required.some(r => list.includes(r)); // any-of
  return list.includes(required);
}

/**
 * May this member reach the dashboard at all?
 *
 * The dashboard has two audiences: STAFF (owner or anyone with at least one
 * permission) and END USERS (a member with no permissions who only ever sees
 * their own tickets). The end-user portal is an explicit opt-in: turning the
 * dashboard on for your staff must not silently open a login to your whole
 * member base. So:
 *
 *   • owner                        → always allowed (never gated, never lockable)
 *   • at least one permission       → staff, always allowed
 *   • no permissions                → only when the public portal is opted in
 *
 * This is the sole gate that decides "in or out"; WHAT an allowed member can do
 * is still governed entirely by resolvePermissions.
 *
 * @param {{ isOwner?: boolean, permissions?: string[], publicPortal?: boolean }} input
 * @returns {boolean}
 */
function canUseDashboard({ isOwner = false, permissions = [], publicPortal = false } = {}) {
  if (isOwner) return true;
  if (Array.isArray(permissions) && permissions.length > 0) return true;
  return publicPortal === true;
}

/**
 * Guard against an actor destroying or escalating their own access.
 *
 * Mirrors the three rules from the msk-shop admin dashboard. Granting permissions
 * to OTHER people stays allowed — only self-edits are constrained.
 *
 * @returns {string|null} an error message, or null when the edit is allowed.
 */
function checkSelfEdit({ actorId, actorIsOwner, actorPermissions, targetType, targetId, nextPermissions, nextActive }) {
  // Only self-edits are restricted. The owner is unconstrained (they cannot lose
  // their implicit permissions anyway, since those never come from the DB).
  if (actorIsOwner) return null;
  if (targetType !== 'user' || targetId !== actorId) return null;

  const next = Array.isArray(nextPermissions) ? nextPermissions : [];
  const own  = Array.isArray(actorPermissions) ? actorPermissions : [];

  if (!next.includes('access.manage')) {
    return "You cannot remove your own 'Manage permissions' permission.";
  }
  if (!nextActive) {
    return 'You cannot deactivate your own access.';
  }
  const escalated = next.filter(p => !own.includes(p));
  if (escalated.length > 0) {
    return `You cannot grant yourself additional permissions: ${escalated.join(', ')}`;
  }
  return null;
}

module.exports = {
  PERMISSIONS, PERMISSION_LABELS, SUBJECT_TYPES,
  isPermission, isSubjectType, parsePermissions,
  selectAccessRows, resolvePermissions, hasPermission, canUseDashboard, checkSelfEdit,
};
