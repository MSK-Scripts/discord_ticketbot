const { parseDatabaseUrl } = require('./url');
const { getCreateStatements, getMigrations } = require('./schema');

/**
 * Multi-engine database layer. The public API (30 named functions) is identical
 * to the original SQLite-only module — every function is now async and delegates
 * to the active driver. Backend selection happens via DATABASE_URL (.env);
 * SQLite (data/tickets.db) is the default when no URL is set.
 */

/** @type {import('./drivers/sqlite').createSqliteDriver|null} */
let activeDriver = null;

// COUNT()/AVG() come back as strings from pg (bigint/numeric) and sometimes
// mysql2 — coerce so callers always get a number (or null).
const num = (v) => (v === null || v === undefined ? null : Number(v));

function createDriver(descriptor) {
  switch (descriptor.client) {
    case 'sqlite':   return require('./drivers/sqlite').createSqliteDriver(descriptor);
    case 'mysql':    return require('./drivers/mysql').createMysqlDriver(descriptor);
    case 'postgres': return require('./drivers/postgres').createPostgresDriver(descriptor);
    default:         throw new Error(`Unsupported database client: ${descriptor.client}`);
  }
}

async function applySchema(driver) {
  for (const stmt of getCreateStatements(driver.dialect)) {
    await driver.exec(stmt);
  }
  // Dialect-generic inline migrations (ADD COLUMN syntax is identical). For
  // fresh MySQL/Postgres schemas these columns already exist → no-op.
  for (const m of getMigrations(driver.dialect)) {
    if (!(await driver.columnExists(m.table, m.column))) {
      await driver.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.definition}`);
    }
  }
  await migrateBlacklistUnique(driver);
  await migrateTranscriptColumnType(driver);
}

/**
 * Widen tickets.transcript from TEXT to LONGTEXT on existing MySQL/MariaDB
 * databases. The column stores the full HTML transcript, which routinely
 * exceeds MySQL's 64 KB TEXT limit (base64 avatars/attachments), so a close
 * would fail with "data too long for column 'transcript'".
 *
 * MySQL-only: SQLite and Postgres TEXT is already unbounded. Fresh MySQL
 * installs get LONGTEXT straight from getCreateStatements, so this only upgrades
 * pre-existing databases. Idempotent — it no-ops once the column is a long type.
 */
async function migrateTranscriptColumnType(driver) {
  if (driver.family !== 'mysql') return;
  try {
    const row = await driver.get(
      `SELECT DATA_TYPE FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'tickets' AND column_name = 'transcript'`,
    );
    const type = (row?.DATA_TYPE ?? row?.data_type ?? '').toString().toLowerCase();
    // Already a long-enough text type → nothing to do.
    if (type === 'longtext' || type === 'mediumtext') return;
    await driver.exec('ALTER TABLE tickets MODIFY transcript LONGTEXT');
  } catch (err) {
    // A failed widening must not stop the bot from booting; surface it so it is
    // not silent. Closing a ticket with a large transcript will keep failing
    // until this succeeds, but the bot otherwise runs.
    console.warn(`[Database] Could not widen tickets.transcript to LONGTEXT: ${err.message}`);
  }
}

/**
 * Upgrade the blacklist UNIQUE constraint from the old global `UNIQUE(user_id)`
 * to `UNIQUE(guild_id, user_id)`.
 *
 * A fresh install already has the composite key from getCreateStatements, so this
 * only affects databases created before the fix. MySQL/Postgres can swap the
 * index in place; SQLite cannot drop a column-level constraint, so it needs a
 * full table rebuild. Idempotent: it detects the old shape and no-ops otherwise.
 */
async function migrateBlacklistUnique(driver) {
  if (driver.dialect === 'sqlite') {
    const row = await driver.get(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='blacklist'");
    // The old schema had `user_id ... UNIQUE` inline; the new one has none there.
    if (!row || !/user_id[^,\n]*\bUNIQUE\b/i.test(row.sql)) return;

    // No dedup needed: the old UNIQUE(user_id) guaranteed there are no duplicate
    // user ids to collide on the new composite key.
    await driver.exec(`
      BEGIN;
      CREATE TABLE blacklist_new (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id  TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        reason   TEXT,
        added_by TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        UNIQUE (guild_id, user_id)
      );
      INSERT INTO blacklist_new (id, user_id, guild_id, reason, added_by, added_at)
        SELECT id, user_id, guild_id, reason, added_by, added_at FROM blacklist;
      DROP TABLE blacklist;
      ALTER TABLE blacklist_new RENAME TO blacklist;
      COMMIT;
    `);
    return;
  }

  // MySQL / Postgres: replace the index only if a single-column unique on user_id
  // still exists. Wrapped in try/catch because the index name differs per engine
  // and a fresh schema simply has nothing to drop.
  try {
    if (driver.family === 'mysql') {
      const idx = await driver.all('SHOW INDEX FROM blacklist WHERE Column_name = ? AND Non_unique = 0', ['user_id']);
      const soloUnique = (idx ?? []).filter(r => r.Key_name !== 'PRIMARY');
      // A composite key lists user_id as one of several columns; a solo unique is
      // its own key with just user_id. Only drop the latter.
      for (const r of soloUnique) {
        const cols = await driver.all('SHOW INDEX FROM blacklist WHERE Key_name = ?', [r.Key_name]);
        if ((cols ?? []).length === 1) {
          await driver.exec(`ALTER TABLE blacklist DROP INDEX \`${r.Key_name}\``);
          await driver.exec('ALTER TABLE blacklist ADD UNIQUE (guild_id, user_id)');
        }
      }
    } else {
      // Postgres: drop the auto-named single-column unique if present, add composite.
      const rows = await driver.all(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'blacklist'`);
      const solo = (rows ?? []).find(r => /UNIQUE/i.test(r.indexdef) && /\(user_id\)/i.test(r.indexdef));
      const composite = (rows ?? []).some(r => /\(guild_id, ?user_id\)/i.test(r.indexdef));
      if (solo && !composite) {
        await driver.exec(`DROP INDEX IF EXISTS ${solo.indexname}`);
        await driver.exec('ALTER TABLE blacklist ADD UNIQUE (guild_id, user_id)');
      }
    }
  } catch (err) {
    // A failed reindex must not stop the bot from booting; the worst case is the
    // old constraint lingering on a shared DB, which the CREATE covers for fresh
    // installs anyway. Surface it so it is not silent.
    console.warn(`[Database] Could not migrate blacklist UNIQUE constraint: ${err.message}`);
  }
}

/**
 * Connect to a database and apply the schema. Throws on failure (no exit) —
 * used by the migration script for both source and target.
 * @param {string|undefined} urlStr
 * @returns {Promise<object>} a connected driver
 */
async function openDatabase(urlStr) {
  const descriptor = parseDatabaseUrl(urlStr);
  const driver = createDriver(descriptor);
  await driver.connect();
  await applySchema(driver);
  return driver;
}

/**
 * Initialize the bot's database from process.env.DATABASE_URL.
 * Fails fast with a clear message + exit(1) on any connection/schema error.
 * @returns {Promise<object>} the active driver
 */
async function initDatabase() {
  try {
    activeDriver = await openDatabase(process.env.DATABASE_URL);
    return activeDriver;
  } catch (err) {
    console.error('');
    console.error(`[Database] Failed to initialize the database: ${err.message}`);
    console.error('[Database] Check DATABASE_URL in your .env file');
    console.error('[Database]   • unset / empty  → bundled SQLite (data/tickets.db)');
    console.error('[Database]   • MySQL/MariaDB  → mysql://user:pass@host:3306/dbname');
    console.error('[Database]   • PostgreSQL     → postgres://user:pass@host:5432/dbname');
    console.error('');
    process.exit(1);
  }
}

async function closeDatabase() {
  if (activeDriver) { await activeDriver.close(); activeDriver = null; }
}

// ─── Ticket Operations ────────────────────────────────────────────────────────

async function createTicket({ channelId, guildId, creatorId, type, priority = 'medium' }) {
  const now = Date.now();
  return activeDriver.run(
    `INSERT INTO tickets (channel_id, guild_id, creator_id, type, priority, last_activity, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [channelId, guildId, creatorId, type, priority, now, now],
  );
}

/**
 * Returns the total number of tickets ever created on this guild.
 * Used as a sequential TICKETCOUNT that never resets.
 * @param {string} guildId
 * @returns {Promise<number>}
 */
async function getTotalTicketCount(guildId) {
  const row = await activeDriver.get('SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ?', [guildId]);
  return num(row.c) ?? 0;
}

async function getTicketByChannel(channelId) {
  return activeDriver.get('SELECT * FROM tickets WHERE channel_id = ?', [channelId]);
}

async function getTicketById(id) {
  return activeDriver.get('SELECT * FROM tickets WHERE id = ?', [id]);
}

async function getOpenTicketsByUser(userId, guildId) {
  return activeDriver.all(
    "SELECT * FROM tickets WHERE creator_id = ? AND guild_id = ? AND status = 'open'",
    [userId, guildId],
  );
}

async function closeTicket(channelId, closedBy, reason, transcript) {
  const now = Date.now();
  return activeDriver.run(
    `UPDATE tickets
     SET status = 'closed', closed_by = ?, closed_at = ?, close_reason = ?, transcript = ?
     WHERE channel_id = ?`,
    [closedBy, now, reason, transcript, channelId],
  );
}

async function reopenTicket(channelId) {
  return activeDriver.run(
    `UPDATE tickets
     SET status = 'open', closed_by = NULL, closed_at = NULL, close_reason = NULL, last_activity = ?
     WHERE channel_id = ?`,
    [Date.now(), channelId],
  );
}

async function claimTicket(channelId, staffId) {
  return activeDriver.run(
    'UPDATE tickets SET claimed_by = ?, claimed_at = ? WHERE channel_id = ?',
    [staffId, Date.now(), channelId],
  );
}

async function unclaimTicket(channelId) {
  return activeDriver.run(
    'UPDATE tickets SET claimed_by = NULL, claimed_at = NULL WHERE channel_id = ?',
    [channelId],
  );
}

async function setPriority(channelId, priority) {
  return activeDriver.run('UPDATE tickets SET priority = ? WHERE channel_id = ?', [priority, channelId]);
}

async function setType(channelId, newType) {
  return activeDriver.run('UPDATE tickets SET type = ? WHERE channel_id = ?', [newType, channelId]);
}

async function updateLastActivity(channelId) {
  return activeDriver.run(
    'UPDATE tickets SET last_activity = ?, message_count = message_count + 1 WHERE channel_id = ?',
    [Date.now(), channelId],
  );
}

async function setStaffReminded(channelId) {
  return activeDriver.run('UPDATE tickets SET staff_reminded_at = ? WHERE channel_id = ?', [Date.now(), channelId]);
}

// Pause/resume the inactivity handling (auto-close warning + closure, and the
// staff reminder) for a single ticket. Resuming also refreshes last_activity so
// the ticket starts a FRESH inactivity window instead of being closed instantly
// for the time it spent paused.
async function setAutoClosePaused(channelId, paused) {
  if (paused) {
    return activeDriver.run('UPDATE tickets SET auto_close_paused = 1 WHERE channel_id = ?', [channelId]);
  }
  return activeDriver.run(
    'UPDATE tickets SET auto_close_paused = 0, last_activity = ? WHERE channel_id = ?',
    [Date.now(), channelId],
  );
}

async function getInactiveTickets(thresholdMs, excludeClaimed = true, guildId = null) {
  const cutoff = Date.now() - thresholdMs;
  // guild_id filter: on a shared database this loop must only ever act on the
  // calling process's own guild, or it would auto-close another tenant's tickets.
  const scope = guildId ? ' AND guild_id = ?' : '';
  // auto_close_paused = 0: a ticket a staff member deliberately parked with
  // /autoclose pause is skipped entirely (no warning, no closure).
  const query = excludeClaimed
    ? `SELECT * FROM tickets WHERE status = 'open' AND auto_close_paused = 0 AND last_activity < ? AND claimed_by IS NULL${scope}`
    : `SELECT * FROM tickets WHERE status = 'open' AND auto_close_paused = 0 AND last_activity < ?${scope}`;
  return activeDriver.all(query, guildId ? [cutoff, guildId] : [cutoff]);
}

async function getTicketsNeedingStaffReminder(reminderMs, guildId = null) {
  const cutoff = Date.now() - reminderMs;
  const scope = guildId ? ' AND guild_id = ?' : '';
  return activeDriver.all(
    `SELECT * FROM tickets
     WHERE status = 'open'
       AND auto_close_paused = 0
       AND last_activity < ?
       AND (staff_reminded_at IS NULL OR staff_reminded_at < ?)${scope}`,
    guildId ? [cutoff, cutoff, guildId] : [cutoff, cutoff],
  );
}

async function getAllOpenTickets(guildId, type = null) {
  if (type) {
    return activeDriver.all(
      "SELECT * FROM tickets WHERE guild_id = ? AND status = 'open' AND type = ?",
      [guildId, type],
    );
  }
  return activeDriver.all("SELECT * FROM tickets WHERE guild_id = ? AND status = 'open'", [guildId]);
}

async function lockTicket(channelId) {
  return activeDriver.run('UPDATE tickets SET locked = 1 WHERE channel_id = ?', [channelId]);
}

async function unlockTicket(channelId) {
  return activeDriver.run('UPDATE tickets SET locked = 0 WHERE channel_id = ?', [channelId]);
}

async function setNotifyOnReply(channelId, value) {
  return activeDriver.run('UPDATE tickets SET notify_on_reply = ? WHERE channel_id = ?', [value, channelId]);
}

async function setLastNotifySent(channelId) {
  return activeDriver.run('UPDATE tickets SET last_notify_sent = ? WHERE channel_id = ?', [Date.now(), channelId]);
}

async function getStats(guildId) {
  const total  = num((await activeDriver.get("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ?", [guildId])).c);
  const open   = num((await activeDriver.get("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ? AND status = 'open'", [guildId])).c);
  const closed = num((await activeDriver.get("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ? AND status = 'closed'", [guildId])).c);
  const avgRating = num((await activeDriver.get(
    `SELECT AVG(r.rating) AS avg FROM ratings r
     JOIN tickets t ON r.ticket_id = t.id WHERE t.guild_id = ?`, [guildId])).avg);
  const avgDuration = num((await activeDriver.get(
    `SELECT AVG(closed_at - created_at) AS avg FROM tickets
     WHERE guild_id = ? AND status = 'closed' AND closed_at IS NOT NULL`, [guildId])).avg);
  const topStaffRows = await activeDriver.all(
    `SELECT closed_by, COUNT(*) AS count FROM tickets
     WHERE guild_id = ? AND status = 'closed' AND closed_by IS NOT NULL
     GROUP BY closed_by ORDER BY count DESC LIMIT 3`, [guildId]);
  const topStaff = topStaffRows.map(s => ({ closed_by: s.closed_by, count: num(s.count) }));

  return { total, open, closed, avgRating, avgDuration, topStaff };
}

async function getUserStats(userId, guildId) {
  const opened = num((await activeDriver.get(
    "SELECT COUNT(*) AS c FROM tickets WHERE creator_id = ? AND guild_id = ?", [userId, guildId])).c);
  const openNow = num((await activeDriver.get(
    "SELECT COUNT(*) AS c FROM tickets WHERE creator_id = ? AND guild_id = ? AND status = 'open'", [userId, guildId])).c);
  const closedAsCreator = num((await activeDriver.get(
    "SELECT COUNT(*) AS c FROM tickets WHERE creator_id = ? AND guild_id = ? AND status = 'closed'", [userId, guildId])).c);
  const ratingsGiven = await activeDriver.get(
    `SELECT AVG(r.rating) AS avg, COUNT(*) AS count FROM ratings r
     JOIN tickets t ON r.ticket_id = t.id WHERE r.user_id = ? AND t.guild_id = ?`, [userId, guildId]);
  const favoriteType = await activeDriver.get(
    `SELECT type, COUNT(*) AS count FROM tickets
     WHERE creator_id = ? AND guild_id = ?
     GROUP BY type ORDER BY count DESC LIMIT 1`, [userId, guildId]);
  const closedAsStaff = num((await activeDriver.get(
    "SELECT COUNT(*) AS c FROM tickets WHERE closed_by = ? AND guild_id = ?", [userId, guildId])).c);
  const staffRating = await activeDriver.get(
    `SELECT AVG(r.rating) AS avg, COUNT(*) AS count FROM ratings r
     JOIN tickets t ON r.ticket_id = t.id WHERE t.closed_by = ? AND t.guild_id = ?`, [userId, guildId]);
  const claimed = num((await activeDriver.get(
    "SELECT COUNT(*) AS c FROM tickets WHERE claimed_by = ? AND guild_id = ?", [userId, guildId])).c);

  return {
    opened, openNow, closedAsCreator,
    ratingsGiven: num(ratingsGiven.avg), ratingsGivenCount: num(ratingsGiven.count),
    favoriteType: favoriteType?.type ?? null,
    closedAsStaff, staffRating: num(staffRating.avg), staffRatingCount: num(staffRating.count),
    claimed,
  };
}

// ─── Blacklist ────────────────────────────────────────────────────────────────

async function addToBlacklist({ userId, guildId, reason, addedBy }) {
  const params = [userId, guildId, reason ?? null, addedBy, Date.now()];
  if (activeDriver.family === 'mysql') {
    return activeDriver.run(
      `INSERT IGNORE INTO blacklist (user_id, guild_id, reason, added_by, added_at)
       VALUES (?, ?, ?, ?, ?)`, params);
  }
  return activeDriver.run(
    `INSERT INTO blacklist (user_id, guild_id, reason, added_by, added_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (guild_id, user_id) DO NOTHING`, params);
}

async function removeFromBlacklist(userId, guildId) {
  // Scoped by guild: on a shared database an unscoped DELETE would wipe another
  // guild's blacklist row for the same user id.
  return activeDriver.run(
    'DELETE FROM blacklist WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
}

async function isBlacklisted(userId, guildId) {
  return !!(await activeDriver.get(
    'SELECT 1 AS x FROM blacklist WHERE user_id = ? AND guild_id = ?', [userId, guildId]));
}

async function getBlacklist(guildId) {
  return activeDriver.all('SELECT * FROM blacklist WHERE guild_id = ? ORDER BY added_at DESC', [guildId]);
}

// ─── Staff Notes ──────────────────────────────────────────────────────────────

async function addNote(ticketId, authorId, content) {
  return activeDriver.run(
    `INSERT INTO staff_notes (ticket_id, author_id, content, created_at)
     VALUES (?, ?, ?, ?)`,
    [ticketId, authorId, content, Date.now()],
  );
}

async function getNotes(ticketId) {
  return activeDriver.all('SELECT * FROM staff_notes WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId]);
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

async function addRating(ticketId, userId, rating, comment) {
  const params = [ticketId, userId, rating, comment ?? null, Date.now()];
  if (activeDriver.family === 'mysql') {
    return activeDriver.run(
      `INSERT INTO ratings (ticket_id, user_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id), rating = VALUES(rating),
         comment = VALUES(comment), created_at = VALUES(created_at)`, params);
  }
  return activeDriver.run(
    `INSERT INTO ratings (ticket_id, user_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (ticket_id) DO UPDATE SET
       user_id = excluded.user_id, rating = excluded.rating,
       comment = excluded.comment, created_at = excluded.created_at`, params);
}

async function getRating(ticketId) {
  return activeDriver.get('SELECT * FROM ratings WHERE ticket_id = ?', [ticketId]);
}

// ─── Panel Message ────────────────────────────────────────────────────────────
// Tracks where the ticket panel was sent (one per guild) so the bot can
// auto-refresh that exact message on every boot — operators no longer have to
// re-run /setup after an update that changes the panel embed/text.

async function savePanelMessage(guildId, channelId, messageId) {
  const params = [guildId, channelId, messageId, Date.now()];
  if (activeDriver.family === 'mysql') {
    return activeDriver.run(
      `INSERT INTO panel_messages (guild_id, channel_id, message_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         channel_id = VALUES(channel_id), message_id = VALUES(message_id),
         updated_at = VALUES(updated_at)`, params);
  }
  return activeDriver.run(
    `INSERT INTO panel_messages (guild_id, channel_id, message_id, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (guild_id) DO UPDATE SET
       channel_id = excluded.channel_id, message_id = excluded.message_id,
       updated_at = excluded.updated_at`, params);
}

async function getPanelMessage(guildId) {
  return activeDriver.get('SELECT * FROM panel_messages WHERE guild_id = ?', [guildId]);
}

async function deletePanelMessage(guildId) {
  return activeDriver.run('DELETE FROM panel_messages WHERE guild_id = ?', [guildId]);
}

// ─── Dashboard: ticket queries ───────────────────────────────────────────────

/**
 * All tickets created by one user (open and/or closed). Backs the end-user
 * portal ("my tickets") — the existing getOpenTicketsByUser only covers open
 * ones and there was no way to list a user's closed tickets at all.
 * @param {string} userId
 * @param {string} guildId
 * @param {'open'|'closed'|null} status  null = both
 */
async function getTicketsByUser(userId, guildId, status = null) {
  if (status) {
    return activeDriver.all(
      `SELECT * FROM tickets WHERE creator_id = ? AND guild_id = ? AND status = ?
       ORDER BY created_at DESC`, [userId, guildId, status]);
  }
  return activeDriver.all(
    `SELECT * FROM tickets WHERE creator_id = ? AND guild_id = ?
     ORDER BY created_at DESC`, [userId, guildId]);
}

// LIMIT/OFFSET are inlined as clamped integers, never as placeholders: mysql2
// does not accept bound parameters there. They are parsed and clamped, so no
// raw input ever reaches the SQL string.
const clampInt = (v, def, min, max) => {
  const n = parseInt(v, 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : def, min), max);
};

function ticketFilterSql(guildId, { status, type, priority, claimedBy } = {}) {
  const where = ['guild_id = ?'];
  const params = [guildId];
  if (status)    { where.push('status = ?');     params.push(status); }
  if (type)      { where.push('type = ?');       params.push(type); }
  if (priority)  { where.push('priority = ?');   params.push(priority); }
  if (claimedBy) { where.push('claimed_by = ?'); params.push(claimedBy); }
  return { sql: where.join(' AND '), params };
}

/** Filtered, paginated ticket list for the staff dashboard. */
async function listTickets(guildId, filters = {}) {
  const { sql, params } = ticketFilterSql(guildId, filters);
  const limit  = clampInt(filters.limit, 50, 1, 100);
  const offset = clampInt(filters.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  return activeDriver.all(
    `SELECT * FROM tickets WHERE ${sql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params);
}

/** Total row count for the same filters — used for pagination. */
async function countTickets(guildId, filters = {}) {
  const { sql, params } = ticketFilterSql(guildId, filters);
  const row = await activeDriver.get(
    `SELECT COUNT(*) AS c FROM tickets WHERE ${sql}`, params);
  return num(row?.c) ?? 0;
}

// ─── Dashboard: access control ───────────────────────────────────────────────

/** Active access rows for a guild. Loaded live on every request so that a
 *  revoked permission takes effect immediately (permissions are never baked
 *  into the session). */
async function getDashboardAccess(guildId) {
  return activeDriver.all(
    'SELECT * FROM dashboard_access WHERE guild_id = ? AND active = 1', [guildId]);
}

/** All rows incl. deactivated ones — for the management UI. */
async function listDashboardAccess(guildId) {
  return activeDriver.all(
    `SELECT * FROM dashboard_access WHERE guild_id = ?
     ORDER BY subject_type ASC, created_at DESC`, [guildId]);
}

async function upsertDashboardAccess({ guildId, subjectType, subjectId, permissions, active = 1, createdBy }) {
  const params = [
    guildId, subjectType, subjectId,
    JSON.stringify(permissions ?? []),
    active ? 1 : 0, Date.now(), createdBy,
  ];
  if (activeDriver.family === 'mysql') {
    return activeDriver.run(
      `INSERT INTO dashboard_access (guild_id, subject_type, subject_id, permissions, active, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         permissions = VALUES(permissions), active = VALUES(active)`, params);
  }
  return activeDriver.run(
    `INSERT INTO dashboard_access (guild_id, subject_type, subject_id, permissions, active, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (guild_id, subject_type, subject_id) DO UPDATE SET
       permissions = excluded.permissions, active = excluded.active`, params);
}

async function deleteDashboardAccess(guildId, subjectType, subjectId) {
  return activeDriver.run(
    'DELETE FROM dashboard_access WHERE guild_id = ? AND subject_type = ? AND subject_id = ?',
    [guildId, subjectType, subjectId]);
}

// ─── Dashboard: audit log ────────────────────────────────────────────────────

/**
 * Append one audit row. Deliberately fire-and-forget: the mutation it records
 * has already happened, so a failing audit insert must never turn a successful
 * action into an error response.
 */
async function writeDashboardAudit({ guildId, actorId, action, target = null, detail = null }) {
  try {
    return await activeDriver.run(
      `INSERT INTO dashboard_audit (guild_id, actor_id, action, target, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, actorId, action, target, detail ? JSON.stringify(detail) : null, Date.now()]);
  } catch (err) {
    console.error('[Dashboard/Audit] failed to write audit row:', err.message);
    return null;
  }
}

async function getDashboardAudit(guildId, limit = 100) {
  const lim = clampInt(limit, 100, 1, 200);
  return activeDriver.all(
    `SELECT * FROM dashboard_audit WHERE guild_id = ?
     ORDER BY created_at DESC, id DESC LIMIT ${lim}`, [guildId]);
}

module.exports = {
  initDatabase, openDatabase, closeDatabase,
  createTicket, getTotalTicketCount, getTicketByChannel, getTicketById,
  getOpenTicketsByUser, getAllOpenTickets, closeTicket, reopenTicket, claimTicket, unclaimTicket,
  setPriority, setType, updateLastActivity, setStaffReminded, setAutoClosePaused,
  lockTicket, unlockTicket, setNotifyOnReply, setLastNotifySent,
  getInactiveTickets, getTicketsNeedingStaffReminder,
  getStats, getUserStats,
  addToBlacklist, removeFromBlacklist, isBlacklisted, getBlacklist,
  addNote, getNotes,
  addRating, getRating,
  savePanelMessage, getPanelMessage, deletePanelMessage,
  // Dashboard
  getTicketsByUser, listTickets, countTickets,
  getDashboardAccess, listDashboardAccess, upsertDashboardAccess, deleteDashboardAccess,
  writeDashboardAudit, getDashboardAudit,
};
