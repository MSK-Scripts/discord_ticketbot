/**
 * PostgreSQL driver (pg). The shared queries use `?` placeholders; pg expects
 * `$1, $2, …`, so each statement is translated on the way out. Our queries
 * never contain a literal `?` inside a string, so a sequential replace is safe.
 * `family: 'standard'` means it shares the ON CONFLICT upsert syntax with SQLite.
 *
 * @param {{ options: object }} descriptor
 */
function createPostgresDriver(descriptor) {
  const { Pool, types } = require('pg');
  let pool;

  // pg returns BIGINT (int8, OID 20) as a string, SQLite and mysql2 return a
  // number. Every BIGINT column here is a millisecond timestamp or a row id,
  // well inside Number.MAX_SAFE_INTEGER (Discord ids are VARCHAR), so parse
  // them as numbers for this pool only. As strings, new Date(created_at) was
  // an Invalid Date and every transcript failed to build.
  const INT8_OID = 20;
  const typeParsers = {
    getTypeParser: (oid, format) =>
      (oid === INT8_OID && format !== 'binary') ? Number : types.getTypeParser(oid, format),
  };

  const norm = (params) => (params || []).map(p => (p === undefined ? null : p));

  // ?  →  $1, $2, $3 …
  const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

  return {
    dialect: 'postgres',
    family:  'standard',

    async connect() {
      // connectionTimeoutMillis: without it a connect to an unreachable host can
      // hang indefinitely instead of failing the query.
      pool = new Pool({ connectionTimeoutMillis: 10_000, ...descriptor.options, max: 10, types: typeParsers });

      // An idle client that loses its connection (Postgres restart, network blip)
      // emits 'error' on the pool. Unhandled, that event crashes the process; the
      // pool already discards the broken client and reconnects on the next query.
      pool.on('error', (err) => {
        console.error(`[Database] Idle PostgreSQL client error (pool will reconnect): ${err.message}`);
      });

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
