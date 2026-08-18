require('dotenv').config({ quiet: true });
const { TicketClient } = require('./src/client');

const client = new TicketClient();
client.start().catch(err => {
  console.error('[FATAL] Bot failed to start:', err);
  process.exit(1);
});
