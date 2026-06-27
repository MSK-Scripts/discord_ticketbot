/**
 * MySQL / MariaDB driver (mysql2/promise). Uses a connection pool and native
 * `?` positional placeholders. `family: 'mysql'` selects the INSERT IGNORE /
 * ON DUPLICATE KEY UPDATE upsert syntax.
 *
 * @param {{ options: object }} descriptor
 */
function createMysqlDriver(descriptor) {
  const mysql = require('mysql2/promise');
  let pool;

  const norm = (params) => (params || []).map(p => (p === undefined ? null : p));

  return {
    dialect: 'mysql',
    family:  'mysql',

    async connect() {
      pool = mysql.createPool({
        ...descriptor.options,
        waitForConnections: true,
        connectionLimit:    10,
        // Return DECIMAL (e.g. AVG()) as numbers instead of strings.
        decimalNumbers:     true,
      });
      // Fail fast if the connection is unusable.
      const conn = await pool.getConnection();
      conn.release();
    },

    async get(sql, params) {
      const [rows] = await pool.query(sql, norm(params));
      return Array.isArray(rows) ? rows[0] : undefined;
    },
    async all(sql, params) {
      const [rows] = await pool.query(sql, norm(params));
      return Array.isArray(rows) ? rows : [];
    },
    async run(sql, params) {
      await pool.query(sql, norm(params));
      return {};
    },
    async exec(sql) { await pool.query(sql); },

    async columnExists(table, column) {
      const row = await this.get(
        `SELECT 1 AS x FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column],
      );
      return !!row;
    },

    async close() { if (pool) await pool.end(); },
  };
}

module.exports = { createMysqlDriver };
