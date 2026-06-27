const path = require('path');

// __dirname = <project>/src/database  →  ../../data = <project>/data  ✓
const DEFAULT_SQLITE_PATH = path.resolve(__dirname, '../../data/tickets.db');

/**
 * Parse the DATABASE_URL environment variable into a normalized connection
 * descriptor. The bot supports three engines:
 *
 *   - SQLite     (default)     — no URL, or  sqlite:./path.db  /  file:./path.db
 *   - MySQL/MariaDB            — mysql://user:pass@host:3306/dbname
 *                                mariadb://user:pass@host:3306/dbname
 *   - PostgreSQL               — postgres://user:pass@host:5432/dbname
 *                                postgresql://user:pass@host:5432/dbname
 *
 * Credentials live in .env (DATABASE_URL), never in config.jsonc, because the
 * config file is editable through the hosted dashboard and must not hold
 * secrets.
 *
 * @param {string|undefined} urlStr  Raw process.env.DATABASE_URL
 * @returns {{ client: 'sqlite', path: string }
 *           | { client: 'mysql',    options: object }
 *           | { client: 'postgres', options: object }}
 * @throws {Error} on an unsupported scheme or an unparseable URL
 */
function parseDatabaseUrl(urlStr) {
  const raw = (urlStr ?? '').trim();

  // No URL → bundled SQLite file (current default behavior).
  if (raw === '') {
    return { client: 'sqlite', path: DEFAULT_SQLITE_PATH };
  }

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw);
  if (!schemeMatch) {
    throw new Error(
      `DATABASE_URL is set but has no scheme. Expected e.g. "postgres://…", `
      + `"mysql://…" or "sqlite:./data/tickets.db". Got: "${raw}".`
    );
  }
  const scheme = schemeMatch[1].toLowerCase();

  // ── SQLite (custom path) ──────────────────────────────────────────────────
  // sqlite:./data/tickets.db  |  sqlite:///abs/path.db  |  file:./x.db
  if (scheme === 'sqlite' || scheme === 'sqlite3' || scheme === 'file') {
    let p = raw.slice(scheme.length + 1);         // strip "sqlite:" / "file:"
    p = p.replace(/^\/\//, '');                   // drop optional leading //
    if (p === '' || p === ':memory:') {
      return { client: 'sqlite', path: p === ':memory:' ? ':memory:' : DEFAULT_SQLITE_PATH };
    }
    return { client: 'sqlite', path: path.resolve(process.cwd(), p) };
  }

  // ── MySQL / MariaDB / PostgreSQL ──────────────────────────────────────────
  const SUPPORTED = ['mysql', 'mariadb', 'postgres', 'postgresql', 'pg'];
  if (!SUPPORTED.includes(scheme)) {
    throw new Error(
      `DATABASE_URL uses an unsupported scheme "${scheme}". `
      + `Supported: sqlite, file, mysql, mariadb, postgres, postgresql.`
    );
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`DATABASE_URL could not be parsed as a URL: "${raw}".`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database) {
    throw new Error(`DATABASE_URL is missing the database name (the path after the host): "${raw}".`);
  }

  const sslRequested =
    parsed.searchParams.get('ssl') === 'true' ||
    /^(require|verify-ca|verify-full|true)$/i.test(parsed.searchParams.get('sslmode') ?? '');

  const base = {
    host:     parsed.hostname || 'localhost',
    user:     decodeURIComponent(parsed.username || ''),
    password: decodeURIComponent(parsed.password || ''),
    database,
  };

  if (scheme === 'postgres' || scheme === 'postgresql' || scheme === 'pg') {
    return {
      client: 'postgres',
      options: {
        ...base,
        port: parsed.port ? Number(parsed.port) : 5432,
        // node-postgres: rejectUnauthorized:false keeps managed-DB self-signed
        // certs working; operators wanting strict verification can omit ?ssl.
        ...(sslRequested ? { ssl: { rejectUnauthorized: false } } : {}),
      },
    };
  }

  if (scheme === 'mysql' || scheme === 'mariadb') {
    return {
      client: 'mysql',
      options: {
        ...base,
        port: parsed.port ? Number(parsed.port) : 3306,
        ...(sslRequested ? { ssl: { rejectUnauthorized: false } } : {}),
      },
    };
  }

  throw new Error(
    `DATABASE_URL uses an unsupported scheme "${scheme}". `
    + `Supported: sqlite, file, mysql, mariadb, postgres, postgresql.`
  );
}

module.exports = { parseDatabaseUrl, DEFAULT_SQLITE_PATH };
