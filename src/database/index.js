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

async function getInactiveTickets(thresholdMs, excludeClaimed = true) {
  const cutoff = Date.now() - thresholdMs;
  const query = excludeClaimed
    ? "SELECT * FROM tickets WHERE status = 'open' AND last_activity < ? AND claimed_by IS NULL"
    : "SELECT * FROM tickets WHERE status = 'open' AND last_activity < ?";
  return activeDriver.all(query, [cutoff]);
}

async function getTicketsNeedingStaffReminder(reminderMs) {
  const cutoff = Date.now() - reminderMs;
  return activeDriver.all(
    `SELECT * FROM tickets
     WHERE status = 'open'
       AND last_activity < ?
       AND (staff_reminded_at IS NULL OR staff_reminded_at < ?)`,
    [cutoff, cutoff],
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
     ON CONFLICT (user_id) DO NOTHING`, params);
}

async function removeFromBlacklist(userId) {
  return activeDriver.run('DELETE FROM blacklist WHERE user_id = ?', [userId]);
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

module.exports = {
  initDatabase, openDatabase, closeDatabase,
  createTicket, getTotalTicketCount, getTicketByChannel, getTicketById,
  getOpenTicketsByUser, getAllOpenTickets, closeTicket, reopenTicket, claimTicket, unclaimTicket,
  setPriority, setType, updateLastActivity, setStaffReminded,
  lockTicket, unlockTicket, setNotifyOnReply, setLastNotifySent,
  getInactiveTickets, getTicketsNeedingStaffReminder,
  getStats, getUserStats,
  addToBlacklist, removeFromBlacklist, isBlacklisted, getBlacklist,
  addNote, getNotes,
  addRating, getRating,
  savePanelMessage, getPanelMessage, deletePanelMessage,
};
