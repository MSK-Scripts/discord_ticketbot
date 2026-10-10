require('dotenv').config({ quiet: true });
const { TicketClient } = require('./src/client');
const { closeDatabase } = require('./src/database');
const { waitForPendingCloses } = require('./src/utils/ticketActions');

const client = new TicketClient();

// A stray rejection (a Discord API error in a fire-and-forget call, a DB blip in
// a timer) must not take the bot down; Node 24 exits on unhandled rejections by
// default. Log it and carry on.
process.on('unhandledRejection', (err) => {
  client.logger.error('[Process] Unhandled promise rejection:', err);
});

// A synchronous throw that reached the top leaves the process in an unknown
// state: log it and exit so the service manager restarts a clean process.
process.on('uncaughtException', (err) => {
  client.logger.error('[Process] Uncaught exception — exiting:', err);
  process.exit(1);
});

/**
 * Graceful stop for SIGTERM (systemd stop/restart, the dashboard supervisor) and
 * SIGINT (Ctrl+C). Lets a ticket close that is mid-flight finish its DB write,
 * so the channel and the DB row do not disagree, then disconnects cleanly.
 * The supervisor SIGKILLs after 10 s, so the wait stays well below that.
 */
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  client.logger.info(`[Process] ${signal} received — shutting down…`);
  try { await waitForPendingCloses(7_000); } catch { /* best effort */ }
  try { await client.destroy(); } catch { /* already disconnected */ }
  try { await closeDatabase(); } catch { /* already closed */ }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

client.start().catch(err => {
  console.error('[FATAL] Bot failed to start:', err);
  process.exit(1);
});
