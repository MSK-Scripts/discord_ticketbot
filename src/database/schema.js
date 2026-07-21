/**
 * Dialect-aware schema definition.
 *
 * The logical schema is identical across all three engines; only the column
 * type tokens differ. Timestamps and IDs are stored as JS Date.now() integers,
 * booleans as 0/1 — never engine-native DATE/BOOLEAN types — so the application
 * code stays byte-for-byte the same regardless of the backend.
 */

// Per-dialect type tokens. `pk` is the auto-incrementing primary key, `fk` the
// matching integer type for foreign keys referencing it.
const TYPES = {
  sqlite: {
    pk: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    fk: 'INTEGER', id: 'TEXT', label: 'TEXT', text: 'TEXT', bigtext: 'TEXT',
    int: 'INTEGER', bool: 'INTEGER', ts: 'INTEGER',
  },
  mysql: {
    // `text` is MySQL TEXT (64 KB) — fine for short user input. `bigtext` is
    // LONGTEXT (4 GB), needed for the full HTML transcript, which routinely
    // exceeds 64 KB (base64 avatars/attachments). SQLite/Postgres TEXT is already
    // unbounded, so only MySQL needs the distinction.
    pk: 'BIGINT AUTO_INCREMENT PRIMARY KEY',
    fk: 'BIGINT', id: 'VARCHAR(32)', label: 'VARCHAR(64)', text: 'TEXT', bigtext: 'LONGTEXT',
    int: 'INT', bool: 'TINYINT', ts: 'BIGINT',
  },
  postgres: {
    pk: 'BIGSERIAL PRIMARY KEY',
    fk: 'BIGINT', id: 'TEXT', label: 'TEXT', text: 'TEXT', bigtext: 'TEXT',
    int: 'INTEGER', bool: 'INTEGER', ts: 'BIGINT',
  },
};

/**
 * Return the array of CREATE TABLE statements for the given dialect.
 * Each is run individually (so a single driver.exec works for engines that
 * reject multi-statement strings).
 * @param {'sqlite'|'mysql'|'postgres'} dialect
 * @returns {string[]}
 */
function getCreateStatements(dialect) {
  const t = TYPES[dialect];
  if (!t) throw new Error(`Unknown SQL dialect: ${dialect}`);

  return [
    `CREATE TABLE IF NOT EXISTS tickets (
      id                ${t.pk},
      channel_id        ${t.id}    UNIQUE NOT NULL,
      guild_id          ${t.id}    NOT NULL,
      creator_id        ${t.id}    NOT NULL,
      type              ${t.label} NOT NULL,
      status            ${t.label} NOT NULL DEFAULT 'open',
      priority          ${t.label} NOT NULL DEFAULT 'medium',
      claimed_by        ${t.id},
      claimed_at        ${t.ts},
      closed_by         ${t.id},
      closed_at         ${t.ts},
      close_reason      ${t.text},
      last_activity     ${t.ts}    NOT NULL,
      created_at        ${t.ts}    NOT NULL,
      transcript        ${t.bigtext},
      message_count     ${t.int}   NOT NULL DEFAULT 0,
      staff_reminded_at ${t.ts},
      locked            ${t.bool}  NOT NULL DEFAULT 0,
      notify_on_reply   ${t.bool}  NOT NULL DEFAULT 0,
      last_notify_sent  ${t.ts},
      auto_close_paused ${t.bool}  NOT NULL DEFAULT 0
    )`,

    // UNIQUE is (guild_id, user_id), NOT user_id alone: several bot instances can
    // share one external database, and each guild must be able to blacklist the
    // same user independently. A global UNIQUE(user_id) would let only the first
    // guild's row exist and silently swallow every other guild's blacklist entry.
    `CREATE TABLE IF NOT EXISTS blacklist (
      id       ${t.pk},
      user_id  ${t.id} NOT NULL,
      guild_id ${t.id} NOT NULL,
      reason   ${t.text},
      added_by ${t.id} NOT NULL,
      added_at ${t.ts} NOT NULL,
      UNIQUE (guild_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS staff_notes (
      id         ${t.pk},
      ticket_id  ${t.fk}   NOT NULL,
      author_id  ${t.id}   NOT NULL,
      content    ${t.text} NOT NULL,
      created_at ${t.ts}   NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS ratings (
      id         ${t.pk},
      ticket_id  ${t.fk}  UNIQUE NOT NULL,
      user_id    ${t.id}  NOT NULL,
      rating     ${t.int} NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment    ${t.text},
      created_at ${t.ts}  NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS panel_messages (
      guild_id   ${t.id} PRIMARY KEY,
      channel_id ${t.id} NOT NULL,
      message_id ${t.id} NOT NULL,
      updated_at ${t.ts} NOT NULL
    )`,

    // ── Web dashboard ────────────────────────────────────────────────────────
    // Who may access the dashboard, and with which permissions.
    //
    // subject_type is 'user' or 'role'. Resolution order (see src/dashboard/permissions.js):
    //   1. the guild owner always has every permission and can never be locked out
    //   2. an explicit 'user' row OVERRIDES all role rows for that user — this is
    //      what makes it possible to revoke a single permission from one staff
    //      member that their role would otherwise grant
    //   3. otherwise: the union of the permissions of all matching 'role' rows
    //   4. no row at all: no dashboard permissions
    //
    // `permissions` holds a JSON array of permission strings. It is stored as
    // text (not a native JSON column) so the same statement works on all three
    // engines; unknown entries are filtered out on read, so a permission removed
    // from the code can never come back to life through a stale DB row.
    `CREATE TABLE IF NOT EXISTS dashboard_access (
      id           ${t.pk},
      guild_id     ${t.id}    NOT NULL,
      subject_type ${t.label} NOT NULL,
      subject_id   ${t.id}    NOT NULL,
      permissions  ${t.text}  NOT NULL,
      active       ${t.bool}  NOT NULL DEFAULT 1,
      created_at   ${t.ts}    NOT NULL,
      created_by   ${t.id}    NOT NULL,
      UNIQUE (guild_id, subject_type, subject_id)
    )`,

    // Append-only audit trail. Every dashboard mutation writes one row.
    // Writes are fire-and-forget: a failing audit insert must never fail the
    // action that already happened.
    `CREATE TABLE IF NOT EXISTS dashboard_audit (
      id         ${t.pk},
      guild_id   ${t.id}    NOT NULL,
      actor_id   ${t.id}    NOT NULL,
      action     ${t.label} NOT NULL,
      target     ${t.label},
      detail     ${t.text},
      created_at ${t.ts}    NOT NULL
    )`,
  ];
}

/**
 * Inline column migrations. These were originally added to the SQLite schema
 * via ALTER TABLE; fresh MySQL/Postgres installs already have them in the
 * CREATE TABLE above, so columnExists() short-circuits them there. They remain
 * to upgrade pre-existing SQLite databases (and future column additions stay
 * dialect-generic — ADD COLUMN syntax is identical across all three engines).
 * @param {'sqlite'|'mysql'|'postgres'} dialect
 * @returns {Array<{ table: string, column: string, definition: string }>}
 */
function getMigrations(dialect) {
  const t = TYPES[dialect];
  if (!t) throw new Error(`Unknown SQL dialect: ${dialect}`);

  return [
    { table: 'tickets', column: 'staff_reminded_at', definition: t.ts },
    { table: 'tickets', column: 'locked',            definition: `${t.bool} NOT NULL DEFAULT 0` },
    { table: 'tickets', column: 'notify_on_reply',   definition: `${t.bool} NOT NULL DEFAULT 0` },
    { table: 'tickets', column: 'last_notify_sent',  definition: t.ts },
    { table: 'tickets', column: 'auto_close_paused', definition: `${t.bool} NOT NULL DEFAULT 0` },
  ];
}

module.exports = { getCreateStatements, getMigrations };
