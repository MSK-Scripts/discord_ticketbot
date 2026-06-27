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
    fk: 'INTEGER', id: 'TEXT', label: 'TEXT', text: 'TEXT',
    int: 'INTEGER', bool: 'INTEGER', ts: 'INTEGER',
  },
  mysql: {
    pk: 'BIGINT AUTO_INCREMENT PRIMARY KEY',
    fk: 'BIGINT', id: 'VARCHAR(32)', label: 'VARCHAR(64)', text: 'TEXT',
    int: 'INT', bool: 'TINYINT', ts: 'BIGINT',
  },
  postgres: {
    pk: 'BIGSERIAL PRIMARY KEY',
    fk: 'BIGINT', id: 'TEXT', label: 'TEXT', text: 'TEXT',
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
      transcript        ${t.text},
      message_count     ${t.int}   NOT NULL DEFAULT 0,
      staff_reminded_at ${t.ts},
      locked            ${t.bool}  NOT NULL DEFAULT 0,
      notify_on_reply   ${t.bool}  NOT NULL DEFAULT 0,
      last_notify_sent  ${t.ts}
    )`,

    `CREATE TABLE IF NOT EXISTS blacklist (
      id       ${t.pk},
      user_id  ${t.id} UNIQUE NOT NULL,
      guild_id ${t.id} NOT NULL,
      reason   ${t.text},
      added_by ${t.id} NOT NULL,
      added_at ${t.ts} NOT NULL
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
  ];
}

module.exports = { getCreateStatements, getMigrations };
