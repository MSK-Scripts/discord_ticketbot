const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// __dirname = <project>/src  →  ../data = <project>/data  ✓
const DB_PATH = path.resolve(__dirname, '../data/tickets.db');

/** @type {Database.Database} */
let db;

function initDatabase() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }

  db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id        TEXT    UNIQUE NOT NULL,
      guild_id          TEXT    NOT NULL,
      creator_id        TEXT    NOT NULL,
      type              TEXT    NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'open',
      priority          TEXT    NOT NULL DEFAULT 'medium',
      claimed_by        TEXT,
      claimed_at        INTEGER,
      closed_by         TEXT,
      closed_at         INTEGER,
      close_reason      TEXT,
      last_activity     INTEGER NOT NULL,
      created_at        INTEGER NOT NULL,
      transcript        TEXT,
      message_count     INTEGER NOT NULL DEFAULT 0,
      staff_reminded_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS blacklist (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   TEXT    UNIQUE NOT NULL,
      guild_id  TEXT    NOT NULL,
      reason    TEXT,
      added_by  TEXT    NOT NULL,
      added_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id  INTEGER NOT NULL,
      author_id  TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id  INTEGER UNIQUE NOT NULL,
      user_id    TEXT    NOT NULL,
      rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment    TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS panel_messages (
      guild_id   TEXT    PRIMARY KEY,
      channel_id TEXT    NOT NULL,
      message_id TEXT    NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const cols = db.pragma('table_info(tickets)').map(c => c.name);
  if (!cols.includes('staff_reminded_at')) {
    db.exec('ALTER TABLE tickets ADD COLUMN staff_reminded_at INTEGER');
  }
  if (!cols.includes('locked')) {
    db.exec('ALTER TABLE tickets ADD COLUMN locked INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.includes('notify_on_reply')) {
    db.exec('ALTER TABLE tickets ADD COLUMN notify_on_reply INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.includes('last_notify_sent')) {
    db.exec('ALTER TABLE tickets ADD COLUMN last_notify_sent INTEGER');
  }

  return db;
}

// ─── Ticket Operations ────────────────────────────────────────────────────────

function createTicket({ channelId, guildId, creatorId, type, priority = 'medium' }) {
  const now = Date.now();
  return db.prepare(`
    INSERT INTO tickets (channel_id, guild_id, creator_id, type, priority, last_activity, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(channelId, guildId, creatorId, type, priority, now, now);
}

/**
 * Returns the total number of tickets ever created on this guild.
 * Used as a sequential TICKETCOUNT that never resets.
 * @param {string} guildId
 * @returns {number}
 */
function getTotalTicketCount(guildId) {
  return db.prepare('SELECT COUNT(*) as c FROM tickets WHERE guild_id = ?').get(guildId).c;
}

function getTicketByChannel(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
}

function getTicketById(id) {
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
}

function getOpenTicketsByUser(userId, guildId) {
  return db.prepare(
    "SELECT * FROM tickets WHERE creator_id = ? AND guild_id = ? AND status = 'open'"
  ).all(userId, guildId);
}

function closeTicket(channelId, closedBy, reason, transcript) {
  const now = Date.now();
  return db.prepare(`
    UPDATE tickets
    SET status = 'closed', closed_by = ?, closed_at = ?, close_reason = ?, transcript = ?
    WHERE channel_id = ?
  `).run(closedBy, now, reason, transcript, channelId);
}

function reopenTicket(channelId) {
  return db.prepare(`
    UPDATE tickets
    SET status = 'open', closed_by = NULL, closed_at = NULL, close_reason = NULL, last_activity = ?
    WHERE channel_id = ?
  `).run(Date.now(), channelId);
}

function claimTicket(channelId, staffId) {
  return db.prepare(
    'UPDATE tickets SET claimed_by = ?, claimed_at = ? WHERE channel_id = ?'
  ).run(staffId, Date.now(), channelId);
}

function unclaimTicket(channelId) {
  return db.prepare(
    'UPDATE tickets SET claimed_by = NULL, claimed_at = NULL WHERE channel_id = ?'
  ).run(channelId);
}

function setPriority(channelId, priority) {
  return db.prepare('UPDATE tickets SET priority = ? WHERE channel_id = ?').run(priority, channelId);
}

function setType(channelId, newType) {
  return db.prepare('UPDATE tickets SET type = ? WHERE channel_id = ?').run(newType, channelId);
}

function updateLastActivity(channelId) {
  return db.prepare(
    'UPDATE tickets SET last_activity = ?, message_count = message_count + 1 WHERE channel_id = ?'
  ).run(Date.now(), channelId);
}

function setStaffReminded(channelId) {
  return db.prepare(
    'UPDATE tickets SET staff_reminded_at = ? WHERE channel_id = ?'
  ).run(Date.now(), channelId);
}

function getInactiveTickets(thresholdMs, excludeClaimed = true) {
  const cutoff = Date.now() - thresholdMs;
  const query = excludeClaimed
    ? "SELECT * FROM tickets WHERE status = 'open' AND last_activity < ? AND claimed_by IS NULL"
    : "SELECT * FROM tickets WHERE status = 'open' AND last_activity < ?";
  return db.prepare(query).all(cutoff);
}

function getTicketsNeedingStaffReminder(reminderMs) {
  const cutoff = Date.now() - reminderMs;
  return db.prepare(`
    SELECT * FROM tickets
    WHERE status = 'open'
      AND last_activity < ?
      AND (staff_reminded_at IS NULL OR staff_reminded_at < ?)
  `).all(cutoff, cutoff);
}

function getAllOpenTickets(guildId, type = null) {
  if (type) {
    return db.prepare(
      "SELECT * FROM tickets WHERE guild_id = ? AND status = 'open' AND type = ?"
    ).all(guildId, type);
  }
  return db.prepare(
    "SELECT * FROM tickets WHERE guild_id = ? AND status = 'open'"
  ).all(guildId);
}

function lockTicket(channelId) {
  return db.prepare('UPDATE tickets SET locked = 1 WHERE channel_id = ?').run(channelId);
}

function unlockTicket(channelId) {
  return db.prepare('UPDATE tickets SET locked = 0 WHERE channel_id = ?').run(channelId);
}

function setNotifyOnReply(channelId, value) {
  return db.prepare('UPDATE tickets SET notify_on_reply = ? WHERE channel_id = ?').run(value, channelId);
}

function setLastNotifySent(channelId) {
  return db.prepare('UPDATE tickets SET last_notify_sent = ? WHERE channel_id = ?').run(Date.now(), channelId);
}

function getStats(guildId) {
  const total       = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ?").get(guildId).c;
  const open        = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ? AND status = 'open'").get(guildId).c;
  const closed      = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ? AND status = 'closed'").get(guildId).c;
  const avgRating   = db.prepare(`
    SELECT AVG(r.rating) as avg FROM ratings r
    JOIN tickets t ON r.ticket_id = t.id WHERE t.guild_id = ?
  `).get(guildId).avg;
  const avgDuration = db.prepare(`
    SELECT AVG(closed_at - created_at) as avg FROM tickets
    WHERE guild_id = ? AND status = 'closed' AND closed_at IS NOT NULL
  `).get(guildId).avg;
  const topStaff    = db.prepare(`
    SELECT closed_by, COUNT(*) as count FROM tickets
    WHERE guild_id = ? AND status = 'closed' AND closed_by IS NOT NULL
    GROUP BY closed_by ORDER BY count DESC LIMIT 3
  `).all(guildId);

  return { total, open, closed, avgRating, avgDuration, topStaff };
}

function getUserStats(userId, guildId) {
  const opened = db.prepare(
    "SELECT COUNT(*) as c FROM tickets WHERE creator_id = ? AND guild_id = ?"
  ).get(userId, guildId).c;
  const openNow = db.prepare(
    "SELECT COUNT(*) as c FROM tickets WHERE creator_id = ? AND guild_id = ? AND status = 'open'"
  ).get(userId, guildId).c;
  const closedAsCreator = db.prepare(
    "SELECT COUNT(*) as c FROM tickets WHERE creator_id = ? AND guild_id = ? AND status = 'closed'"
  ).get(userId, guildId).c;
  const ratingsGiven = db.prepare(`
    SELECT AVG(r.rating) as avg, COUNT(*) as count FROM ratings r
    JOIN tickets t ON r.ticket_id = t.id WHERE r.user_id = ? AND t.guild_id = ?
  `).get(userId, guildId);
  const favoriteType = db.prepare(`
    SELECT type, COUNT(*) as count FROM tickets
    WHERE creator_id = ? AND guild_id = ?
    GROUP BY type ORDER BY count DESC LIMIT 1
  `).get(userId, guildId);
  const closedAsStaff = db.prepare(
    "SELECT COUNT(*) as c FROM tickets WHERE closed_by = ? AND guild_id = ?"
  ).get(userId, guildId).c;
  const staffRating = db.prepare(`
    SELECT AVG(r.rating) as avg, COUNT(*) as count FROM ratings r
    JOIN tickets t ON r.ticket_id = t.id WHERE t.closed_by = ? AND t.guild_id = ?
  `).get(userId, guildId);
  const claimed = db.prepare(
    "SELECT COUNT(*) as c FROM tickets WHERE claimed_by = ? AND guild_id = ?"
  ).get(userId, guildId).c;

  return {
    opened, openNow, closedAsCreator,
    ratingsGiven: ratingsGiven.avg, ratingsGivenCount: ratingsGiven.count,
    favoriteType: favoriteType?.type ?? null,
    closedAsStaff, staffRating: staffRating.avg, staffRatingCount: staffRating.count,
    claimed,
  };
}

// ─── Blacklist ────────────────────────────────────────────────────────────────

function addToBlacklist({ userId, guildId, reason, addedBy }) {
  return db.prepare(`
    INSERT OR IGNORE INTO blacklist (user_id, guild_id, reason, added_by, added_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, guildId, reason ?? null, addedBy, Date.now());
}
function removeFromBlacklist(userId) {
  return db.prepare('DELETE FROM blacklist WHERE user_id = ?').run(userId);
}
function isBlacklisted(userId, guildId) {
  return !!db.prepare('SELECT 1 FROM blacklist WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}
function getBlacklist(guildId) {
  return db.prepare('SELECT * FROM blacklist WHERE guild_id = ? ORDER BY added_at DESC').all(guildId);
}

// ─── Staff Notes ──────────────────────────────────────────────────────────────

function addNote(ticketId, authorId, content) {
  return db.prepare(`
    INSERT INTO staff_notes (ticket_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?)
  `).run(ticketId, authorId, content, Date.now());
}
function getNotes(ticketId) {
  return db.prepare('SELECT * FROM staff_notes WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId);
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

function addRating(ticketId, userId, rating, comment) {
  return db.prepare(`
    INSERT OR REPLACE INTO ratings (ticket_id, user_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(ticketId, userId, rating, comment ?? null, Date.now());
}
function getRating(ticketId) {
  return db.prepare('SELECT * FROM ratings WHERE ticket_id = ?').get(ticketId);
}

// ─── Panel Message ────────────────────────────────────────────────────────────
// Tracks where the ticket panel was sent (one per guild) so the bot can
// auto-refresh that exact message on every boot — operators no longer have to
// re-run /setup after an update that changes the panel embed/text.

function savePanelMessage(guildId, channelId, messageId) {
  return db.prepare(`
    INSERT INTO panel_messages (guild_id, channel_id, message_id, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      message_id = excluded.message_id,
      updated_at = excluded.updated_at
  `).run(guildId, channelId, messageId, Date.now());
}

function getPanelMessage(guildId) {
  return db.prepare('SELECT * FROM panel_messages WHERE guild_id = ?').get(guildId);
}

function deletePanelMessage(guildId) {
  return db.prepare('DELETE FROM panel_messages WHERE guild_id = ?').run(guildId);
}

module.exports = {
  initDatabase,
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
