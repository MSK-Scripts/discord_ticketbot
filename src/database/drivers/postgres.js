/**
 * PostgreSQL driver (pg). The shared queries use `?` placeholders; pg expects
 * `$1, $2, …`, so each statement is translated on the way out. Our queries
 * never contain a literal `?` inside a string, so a sequential replace is safe.
 * `family: 'standard'` means it shares the ON CONFLICT upsert syntax with SQLite.
 *
 * @param {{ options: object }} descriptor
 */
function createPostgresDriver(descriptor) {
  const { Pool } = require('pg');
  let pool;

  const norm = (params) => (params || []).map(p => (p === undefined ? null : p));

  // ?  →  $1, $2, $3 …
  const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

  return {
    dialect: 'postgres',
    family:  'standard',

    async connect() {
      pool = new Pool({ ...descriptor.options, max: 10 });
      const client = await pool.connect();   // fail fast on bad credentials/host
      client.release();
    },

    async get(sql, params) {
      const res = await pool.query(toPg(sql), norm(params));
      return res.rows[0];
    },
    async all(sql, params) {
      const res = await pool.query(toPg(sql), norm(params));
      return res.rows;
    },
    async run(sql, params) {
      await pool.query(toPg(sql), norm(params));
      return {};
    },
    async exec(sql) { await pool.query(sql); },

    async columnExists(table, column) {
      const row = await this.get(
        `SELECT 1 AS x FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?`,
        [table, column],
      );
      return !!row;
    },

    async close() { if (pool) await pool.end(); },
  };
}

module.exports = { createPostgresDriver };
