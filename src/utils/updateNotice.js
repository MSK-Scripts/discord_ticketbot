/**
 * updateNotice.js
 * Recurring "a new version is out" message in the log channel.
 *
 * The boot check in `versionCheck.js` only reaches whoever watches the console.
 * A self-hosted bot usually runs unattended, so the same information is posted
 * where the operator actually looks: the log channel.
 *
 * Two things this deliberately does NOT do:
 *  - it never posts the same version twice, not even across restarts. The last
 *    announced version is persisted, because a bot that restarts often would
 *    otherwise repeat the notice on every boot.
 *  - it never updates anything by itself. It reports, the operator decides.
 */

const fs   = require('fs');
const path = require('path');

const { fetchLatestRelease, isNewer } = require('./versionCheck');
const { updateAvailableEmbed }        = require('./embeds');

const STORE_FILE            = path.resolve(__dirname, '../../data/update-notice.json');
const DEFAULT_INTERVAL_HOURS = 1;
// GitHub allows 60 unauthenticated calls per hour and IP. Anything below this is
// pointless polling that only risks the rate limit for the boot check as well.
const MIN_INTERVAL_HOURS     = 0.25;
const FIRST_RUN_DELAY_MS     = 30_000;

/** @returns {string|null} the version last announced, or null */
function readAnnounced() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')).announcedVersion ?? null;
  } catch {
    return null; // no file yet, or unreadable — treat as "nothing announced"
  }
}

function writeAnnounced(version) {
  try {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify({ announcedVersion: version }, null, 2));
  } catch {
    // Losing the marker only costs a duplicate notice after the next restart,
    // which must not be worth crashing the bot over.
  }
}

/**
 * Pure decision helper, kept separate so it can be tested without a filesystem
 * or a Discord client.
 * @returns {boolean}
 */
function shouldAnnounce(localVersion, latestVersion, announcedVersion) {
  if (!latestVersion) return false;
  if (!isNewer(localVersion, latestVersion)) return false;
  return announcedVersion !== latestVersion;
}

/** Config with the documented defaults applied: on, every hour. */
function resolveConfig(client) {
  const cfg = client.config.updateNotification ?? {};
  const hours = Number(cfg.intervalHours);

  return {
    enabled: cfg.enabled !== false, // missing key means on
    intervalHours: Number.isFinite(hours) && hours > 0
      ? Math.max(hours, MIN_INTERVAL_HOURS)
      : DEFAULT_INTERVAL_HOURS,
  };
}

/** One check. Exported for the test and for a manual trigger. */
async function runUpdateCheck(client) {
  const channelId = client.config.logsChannelId;
  if (!channelId) return;

  const { version: localVersion } = require('../../package.json');
  const result = await fetchLatestRelease();

  if (result.error) {
    client.logger.debug?.(`[UpdateNotice] Skipped: ${result.error}`);
    return;
  }

  if (!shouldAnnounce(localVersion, result.version, readAnnounced())) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    client.logger.warn(`[UpdateNotice] logsChannelId "${channelId}" not found.`);
    return;
  }

  const sent = await channel
    .send({ embeds: [updateAvailableEmbed(client, {
      current: localVersion, latest: result.version, url: result.url,
    })] })
    .catch(err => {
      client.logger.warn(`[UpdateNotice] Could not post: ${err.message}`);
      return null;
    });

  // Only remember it once it really went out, otherwise a failed send would
  // silence the notice for good.
  if (sent) {
    writeAnnounced(result.version);
    client.logger.info(`[UpdateNotice] Announced v${result.version} in the log channel.`);
  }
}

/**
 * Start the recurring check. No-op when disabled or when no log channel is set —
 * there is nowhere to post to in that case.
 */
function startUpdateNotifier(client) {
  const { enabled, intervalHours } = resolveConfig(client);

  if (!enabled) return;
  if (!client.config.logsChannelId) {
    client.logger.info('[UpdateNotice] No logsChannelId configured, update notices are off.');
    return;
  }

  setTimeout(() => runUpdateCheck(client), FIRST_RUN_DELAY_MS);
  setInterval(() => runUpdateCheck(client), intervalHours * 3_600_000);
  client.logger.info(`[UpdateNotice] Enabled — checks every ${intervalHours}h`);
}

module.exports = {
  startUpdateNotifier,
  runUpdateCheck,
  shouldAnnounce,
  resolveConfig,
  readAnnounced,
  writeAnnounced,
  STORE_FILE,
  DEFAULT_INTERVAL_HOURS,
  MIN_INTERVAL_HOURS,
};
