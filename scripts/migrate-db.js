#!/usr/bin/env node
/**
 * One-shot data migration: copy an existing SQLite database into a MySQL/MariaDB
 * or PostgreSQL backend (or another SQLite file).
 *
 * Usage:
 *   npm run db:migrate                       # SQLite (data/tickets.db) → $DATABASE_URL
 *   node scripts/migrate-db.js --to postgres://user:pass@host/db
 *   node scripts/migrate-db.js --from ./data/tickets.db --to mysql://user:pass@host/db
 *   node scripts/migrate-db.js --to <url> --force   # overwrite non-empty target
 *
 * The target schema is created automatically. Tables are copied in FK-safe
 * order with their primary keys preserved; on PostgreSQL the id sequences are
 * reset afterwards so freshly created tickets don't collide.
 */

require('dotenv').config();
const path = require('path');
const { openDatabase } = require('../src/database');
const { DEFAULT_SQLITE_PATH } = require('../src/database/url');

// ── Args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') args.from = argv[++i];
    else if (argv[i] === '--to') args.to = argv[++i];
    else if (argv[i] === '--force') args.force = true;
  }
  return args;
}

// Normalize a --from value (plain path or sqlite: URL) into a sqlite URL.
function toSourceUrl(from) {
  if (!from) return `sqlite:${DEFAULT_SQLITE_PATH}`;
  if (/^(sqlite|sqlite3|file):/i.test(from)) return from;
  return `sqlite:${path.resolve(process.cwd(), from)}`;
}

// Copy order respects foreign keys (tickets before its children).
const TABLES = [
  { name: 'tickets', cols: [
    'id','channel_id','guild_id','creator_id','type','status','priority',
    'claimed_by','claimed_at','closed_by','closed_at','close_reason',
    'last_activity','created_at','transcript','message_count',
    'staff_reminded_at','locked','notify_on_reply','last_notify_sent',
  ], serial: true },
  { name: 'staff_notes', cols: ['id','ticket_id','author_id','content','created_at'], serial: true },
  { name: 'ratings',     cols: ['id','ticket_id','user_id','rating','comment','created_at'], serial: true },
  { name: 'blacklist',   cols: ['id','user_id','guild_id','reason','added_by','added_at'], serial: true },
  { name: 'panel_messages', cols: ['guild_id','channel_id','message_id','updated_at'], serial: false },
];

async function rowCount(driver, table) {
  const row = await driver.get(`SELECT COUNT(*) AS c FROM ${table}`, []);
  return Number(row.c) || 0;
}

(async () => {
  const args      = parseArgs(process.argv.slice(2));
  const sourceUrl = toSourceUrl(args.from);
  const targetUrl = args.to ?? process.env.DATABASE_URL;

  if (!targetUrl || targetUrl.trim() === '') {
    console.error('[Migrate] No target given. Set DATABASE_URL in .env or pass --to <url>.');
    process.exit(1);
  }

  console.log(`[Migrate] Source: ${sourceUrl}`);
  console.log(`[Migrate] Target: ${targetUrl}`);

  let source, target;
  try {
    source = await openDatabase(sourceUrl);
    target = await openDatabase(targetUrl);
  } catch (err) {
    console.error(`[Migrate] Connection/schema error: ${err.message}`);
    process.exit(1);
  }

  // Guard: refuse to write into a non-empty target unless --force.
  if (!args.force) {
    for (const { name } of TABLES) {
      if (await rowCount(target, name) > 0) {
        console.error(`[Migrate] Target table "${name}" is not empty. Re-run with --force to overwrite/append.`);
        await source.close(); await target.close();
        process.exit(1);
      }
    }
  }

  let grandTotal = 0;
  for (const { name, cols } of TABLES) {
    const rows = await source.all(`SELECT ${cols.join(', ')} FROM ${name}`, []);
    if (rows.length === 0) { console.log(`[Migrate]   ${name}: 0 rows`); continue; }

    const placeholders = cols.map(() => '?').join(', ');
    const insertSql = `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${placeholders})`;
    for (const row of rows) {
      await target.run(insertSql, cols.map(c => row[c]));
    }
    grandTotal += rows.length;
    console.log(`[Migrate]   ${name}: ${rows.length} rows`);
  }

  // PostgreSQL: bump each id sequence past the highest migrated id.
  if (target.dialect === 'postgres') {
    for (const { name, serial } of TABLES) {
      if (!serial) continue;
      if (await rowCount(target, name) === 0) continue;
      await target.get(
        `SELECT setval(pg_get_serial_sequence('${name}', 'id'),
                       (SELECT MAX(id) FROM ${name}), true) AS s`, []);
    }
    console.log('[Migrate] PostgreSQL id sequences reset.');
  }

  await source.close();
  await target.close();
  console.log(`[Migrate] Done — ${grandTotal} rows copied. ✅`);
})().catch(err => { console.error('[Migrate] Failed:', err); process.exit(1); });
