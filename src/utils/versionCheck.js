/**
 * versionCheck.js
 * Compares the local package.json version against the latest GitHub Release.
 * Uses native fetch (Node 22+) — no extra dependencies needed.
 */

const REPO = 'MSK-Scripts/discord_ticketbot';
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

const reset  = '\x1b[0m';
const gray   = '\x1b[90m';
const yellow = '\x1b[33m';
const green  = '\x1b[32m';
const bold   = '\x1b[1m';

/**
 * Compares two semver strings (e.g. "1.2.0" vs "1.3.0").
 * Returns true if remoteVersion is newer than localVersion.
 * @param {string} localVersion
 * @param {string} remoteVersion
 * @returns {boolean}
 */
function isNewer(localVersion, remoteVersion) {
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number);
  const [lMaj, lMin, lPat] = parse(localVersion);
  const [rMaj, rMin, rPat] = parse(remoteVersion);

  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPat > lPat;
}

/**
 * Shape of a release tag we are willing to act on: 1.2.3, optionally with a
 * prerelease suffix and a leading v.
 */
const TAG_PATTERN = /^\d+(\.\d+){0,3}(-[0-9A-Za-z.-]+)?$/;

/**
 * Turn a GitHub release payload into the two values the bot uses.
 *
 * Both are validated here rather than trusted, and this is the only place that
 * happens: the version ends up written to `data/update-notice.json`, and the
 * url is rendered as the link of an embed that every member of the log channel
 * sees. Neither should be whatever the response happened to contain. In
 * practice the payload comes from api.github.com over TLS, so this is a
 * boundary check, not a defence against a specific attack.
 *
 * A tag that does not look like a version is treated as "no usable release"
 * instead of being passed on: the bot then simply stays quiet.
 *
 * Pure and exported so it can be tested without a network call.
 *
 * @param {unknown} data parsed JSON body of the releases/latest endpoint
 * @returns {{version: string, url: string} | {error: string}}
 */
function parseRelease(data) {
  const raw = typeof data?.tag_name === 'string' ? data.tag_name : '';
  const version = raw.replace(/^v/, '');

  if (!version) return { error: 'no release found' };
  if (!TAG_PATTERN.test(version)) return { error: `unexpected tag "${version.slice(0, 32)}"` };

  // Only a link into this project's own repository. Anything else falls back to
  // the releases page, which is always correct.
  const fallback = `https://github.com/${REPO}/releases`;
  const url = typeof data.html_url === 'string' && data.html_url.startsWith(`https://github.com/${REPO}/`)
    ? data.html_url
    : fallback;

  return { version, url };
}

/**
 * Fetches the latest GitHub release.
 *
 * Returns `{ version, url }` on success and `null` on anything else — a missing
 * release, a rate limit, a timeout. The boot check and the recurring log-channel
 * notice share this so there is one place that knows the API shape.
 *
 * @returns {Promise<{ version: string, url: string } | null>}
 */
async function fetchLatestRelease() {
  try {
    const res = await fetch(API_URL, {
      headers: { 'User-Agent': 'discord-ticketbot-version-check' },
      signal: AbortSignal.timeout(5000), // 5 s timeout
    });

    if (!res.ok) return { error: `GitHub returned ${res.status}` };

    return parseRelease(await res.json());
  } catch {
    return { error: 'could not reach GitHub' };
  }
}

/**
 * Fetches the latest release tag from GitHub and prints a notice
 * if a newer version is available.
 *
 * Silent on network errors — the bot starts normally even if GitHub
 * is unreachable.
 */
async function checkVersion() {
  const { version: localVersion } = require('../../package.json');

  process.stdout.write(`${gray}Checking for updates...${reset} `);

  {
    const result = await fetchLatestRelease();

    if (result.error) {
      console.log(`${gray}skipped (${result.error})${reset}`);
      return;
    }

    const remoteVersion = result.version;

    if (isNewer(localVersion, remoteVersion)) {
      console.log(`${yellow}${bold}Update available!${reset}`);
      console.log('');
      console.log(`${yellow}  ╔══════════════════════════════════════════════════╗${reset}`);
      console.log(`${yellow}  ║  🚀  New version available: ${bold}v${remoteVersion}${reset}${yellow}               ║${reset}`);
      console.log(`${yellow}  ║     You are running:        v${localVersion}               ║${reset}`);
      console.log(`${yellow}  ║                                                  ║${reset}`);
      console.log(`${yellow}  ║  To update, run:                                 ║${reset}`);
      console.log(`${yellow}  ║  ${bold}git pull && npm install${reset}${yellow}                       ║${reset}`);
      console.log(`${yellow}  ║  Then restart the bot.                           ║${reset}`);
      console.log(`${yellow}  ║                                                  ║${reset}`);
      console.log(`${yellow}  ║  Changelog: https://github.com/${REPO}/releases ║${reset}`);
      console.log(`${yellow}  ╚══════════════════════════════════════════════════╝${reset}`);
      console.log('');
    } else {
      console.log(`${green}up to date (v${localVersion})${reset}`);
    }
  }
}

module.exports = { checkVersion, fetchLatestRelease, parseRelease, isNewer, REPO };
