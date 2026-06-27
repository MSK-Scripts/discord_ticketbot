const fs = require('fs');
const path = require('path');

/**
 * SQLite driver (better-sqlite3). The underlying library is synchronous; we
 * wrap each call in an async method so the public database API is uniform
 * across all three engines. `family: 'standard'` means it shares the
 * ON CONFLICT upsert syntax with PostgreSQL.
 *
 * @param {{ path: string }} descriptor
 */
function createSqliteDriver(descriptor) {
  const Database = require('better-sqlite3');
  let db;

  // better-sqlite3 (and mysql2/pg) reject `undefined` bind values — map to null.
  const norm = (params) => (params || []).map(p => (p === undefined ? null : p));

  return {
    dialect: 'sqlite',
    family:  'standard',

    async connect() {
      if (descriptor.path !== ':memory:') {
        const dir = path.dirname(descriptor.path);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      }
      db = new Database(descriptor.path);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
    },

    async get(sql, params)  { return db.prepare(sql).get(...norm(params)); },
    async all(sql, params)  { return db.prepare(sql).all(...norm(params)); },
    async run(sql, params)  { db.prepare(sql).run(...norm(params)); return {}; },
    async exec(sql)         { db.exec(sql); },

    async columnExists(table, column) {
      const cols = db.pragma(`table_info(${table})`).map(c => c.name);
      return cols.includes(column);
    },

    async close() { if (db) db.close(); },
  };
}

module.exports = { createSqliteDriver };
