#!/usr/bin/env node
/**
 * `npm run update`: the same update routine as the dashboard's Update button,
 * without the dashboard. Meant for self-hosters and for updating many hosted
 * installations in a loop.
 *
 * It resets package-lock.json, moves locale edits from the tracked
 * locales/<lang>.json into locales/custom/ (one-time migration), sets a replaced
 * assets/logo.png aside and puts it back, then runs `git pull --ff-only` and
 * `npm install --omit=dev`. It does not restart the bot: do that the way the bot
 * runs (systemd, PM2, the dashboard).
 *
 * Exit code 0 on success, 1 on failure.
 */

const path = require('path');
const { runUpdate } = require('../src/utils/updater');

const ROOT = path.resolve(__dirname, '..');
const log = (text) => {
  const s = String(text);
  process.stdout.write(s.endsWith('\n') ? s : `${s}\n`);
};

runUpdate({ root: ROOT, log })
  .then((result) => {
    if (!result.ok) {
      process.stderr.write(`\nUpdate failed: ${result.error}\n${result.detail ? `${result.detail}\n` : ''}`);
      process.exit(1);
    }
    log('\nUpdate finished. Restart the bot to load the new version.');
  })
  .catch((err) => {
    process.stderr.write(`\nUpdate failed: ${err.stack || err.message}\n`);
    process.exit(1);
  });
