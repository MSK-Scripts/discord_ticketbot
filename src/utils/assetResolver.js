const path = require('path');
const fs   = require('fs');

const ASSETS_DIR = path.resolve(__dirname, '../../assets');

/**
 * Resolves a panel image named in the config. The customer's own file in
 * assets/<file> wins; without one, the shipped default in assets/default/<file>
 * is used (that is where the MSK logo lives, so `panel.logo.file: "logo.png"`
 * works out of the box). Customer images in assets/ are gitignored, so replacing
 * the logo never blocks an update. Returns null when neither file exists.
 *
 * The name comes from config.jsonc, which staff with "Edit configuration" can
 * change in the dashboard. A name that leaves the assets folder ("../.env") is
 * refused, otherwise the panel would post any readable file to Discord.
 *
 * Kept out of panel.js so the dashboard can use it without loading discord.js.
 * @param {string} file
 * @param {string} [assetsDir]
 * @returns {string|null}
 */
function resolvePanelAsset(file, assetsDir = ASSETS_DIR) {
  if (typeof file !== 'string' || file === '') return null;
  // Only a plain file name, no folders: the config never needs more.
  if (file !== path.basename(file) || file === '.' || file === '..' || file.includes('/') || file.includes('\\')) return null;
  const root = path.resolve(assetsDir);
  for (const candidate of [path.resolve(root, file), path.resolve(root, 'default', file)]) {
    const rel = path.relative(root, candidate);
    if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) continue;
    if (fs.statSync(candidate, { throwIfNoEntry: false })?.isFile()) return candidate;
  }
  return null;
}

module.exports = { ASSETS_DIR, resolvePanelAsset };
