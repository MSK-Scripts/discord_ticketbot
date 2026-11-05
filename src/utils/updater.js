/**
 * Update routine shared by the dashboard's Update button (supervisor.update())
 * and `npm run update` (scripts/update.js).
 *
 * A plain `git pull` refuses to run as soon as a tracked file it would change is
 * modified locally. Three kinds of local changes used to cause exactly that:
 *   • package-lock.json, which npm rewrites on every `npm install`;
 *   • locales/<lang>.json, which the dashboard used to write customer edits into;
 *   • assets/logo.png, which customers replace with their own logo.
 * This routine clears all three before pulling without losing anything:
 * locale edits move into the customer layer (locales/custom/<lang>.json, see
 * utils/locales.js), a replaced image is set aside and put back after the pull.
 *
 * It does NOT restart anything; the caller decides how (supervisor restart, or
 * the operator's systemd/PM2 after the CLI). Every step reports through `log`.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { mergeLocale, diffLocale, formatLocale, isPlainObject, CUSTOM_DIRNAME } = require('./locales');

const STASH_DIRNAME = '.update-stash';
const LEGACY_SUFFIX = '.pre-custom-layer';
const LOCALE_FILE_RE = /^locales\/[^/]+\.json$/;
const ASSET_FILE_RE = /^assets\/.+/;

/**
 * Default command runner. git runs without a shell (arguments are passed as is);
 * npm needs one on Windows, where it is npm.cmd. Output is collected as Buffers
 * so multi-byte characters split across chunks stay intact.
 *
 * @param {{ cwd: string, onOutput?: (text: string) => void }} options
 * @returns {(cmd: string, args: string[], opts?: { capture?: boolean }) =>
 *   Promise<{ ok: boolean, code: number|null, stdout: string, output: string }>}
 *   With `capture: true` the output is only returned, not streamed to onOutput
 *   (used for `git show` / `git status`, whose output is data, not progress).
 */
function createRunner({ cwd, onOutput = () => {} }) {
  return (cmd, args, { capture = false } = {}) => new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      shell: process.platform === 'win32' && cmd === 'npm',
      // Never wait for a credential prompt nobody can answer.
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    const out = [];
    const all = [];
    proc.stdout?.on('data', (d) => { out.push(d); all.push(d); if (!capture) onOutput(d.toString()); });
    proc.stderr?.on('data', (d) => { all.push(d); if (!capture) onOutput(d.toString()); });
    proc.on('error', (err) => resolve({ ok: false, code: null, stdout: '', output: err.message }));
    proc.on('close', (code) => resolve({
      ok: code === 0,
      code,
      stdout: Buffer.concat(out).toString('utf-8'),
      output: Buffer.concat(all).toString('utf-8').trim(),
    }));
  });
}

/**
 * Parses `git status --porcelain=v1 -z` output into tracked-file entries.
 * Untracked (??) and ignored (!!) entries are dropped; for a rename/copy the
 * second NUL-separated field (the old name) is skipped.
 * @param {string} text
 * @returns {{ x: string, y: string, file: string }[]}
 */
function parsePorcelain(text) {
  const parts = text.split('\0');
  const entries = [];
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i];
    if (item.length < 4) continue;
    const x = item[0];
    const y = item[1];
    const file = item.slice(3);
    if (x === 'R' || x === 'C') i++;
    if (x === '?' || x === '!') continue;
    entries.push({ x, y, file });
  }
  return entries;
}

/** Relative POSIX paths of all files below `dir`. */
function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

const isModified = (e) => /[MT]/.test(e.x) || /[MT]/.test(e.y);
const isDeleted = (e) => e.x === 'D' || e.y === 'D';

function readJson(text) {
  try {
    const value = JSON.parse(text);
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Moves the edits of one locally modified, tracked locale file into the
 * customer layer and resets the tracked file to HEAD. The edited file is kept
 * as <file>.pre-custom-layer (unless such a backup already exists).
 * Values already in the custom file are kept; where the edited tracked file
 * has a value for the same key, the edited value wins, since it is the newer one.
 */
async function migrateLocale({ root, run, log }, rel) {
  const abs = path.join(root, rel);
  const name = path.basename(rel);
  const editedText = fs.readFileSync(abs, 'utf-8');

  const backup = `${abs}${LEGACY_SUFFIX}`;
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, editedText, 'utf-8');

  const head = await run('git', ['show', `HEAD:${rel}`], { capture: true });
  const edited = readJson(editedText);
  const shipped = head.ok ? readJson(head.stdout) : null;

  if (!edited || !shipped) {
    // Nothing can be lost: the edited text sits in the backup next to the file.
    log(`[update] ${rel}: could not compare with the shipped version (${!edited ? 'edited file is not valid JSON' : 'shipped version unreadable'}). Your file is kept as ${path.basename(backup)}; re-apply its changes in the dashboard.`);
  } else {
    const diff = diffLocale(shipped, edited);
    const keys = Object.keys(diff).length;
    if (keys > 0) {
      const customFile = path.join(root, 'locales', CUSTOM_DIRNAME, name);
      let existing = {};
      if (fs.existsSync(customFile)) {
        existing = readJson(fs.readFileSync(customFile, 'utf-8'));
        if (!existing) {
          fs.copyFileSync(customFile, `${customFile}.bak`);
          log(`[update] ${path.posix.join('locales', CUSTOM_DIRNAME, name)} was not valid JSON, kept as ${name}.bak.`);
          existing = {};
        }
      }
      fs.mkdirSync(path.dirname(customFile), { recursive: true });
      fs.writeFileSync(customFile, formatLocale(mergeLocale(existing, diff)), 'utf-8');
      log(`[update] ${rel}: moved your changes to locales/${CUSTOM_DIRNAME}/${name}.`);
    } else {
      log(`[update] ${rel}: no text changes found, only formatting.`);
    }
  }

  const reset = await run('git', ['checkout', 'HEAD', '--', rel]);
  if (!reset.ok) throw new Error(`git checkout ${rel} failed: ${reset.output}`);
}

/**
 * Runs the whole update. Resolves to { ok, output, migrated } or
 * { ok: false, error, detail, migrated }; never throws for an expected failure.
 *
 * @param {object} options
 * @param {string} options.root repository root
 * @param {Function} [options.run] command runner, see createRunner()
 * @param {(line: string) => void} [options.log]
 * @param {boolean} [options.install=true] run `npm install --omit=dev`
 */
async function runUpdate({ root, run, log = () => {}, install = true }) {
  run = run ?? createRunner({ cwd: root, onOutput: log });
  const step = (text) => log(`==> [update] ${text}`);
  const migrated = { locales: [], assets: [] };
  const outputs = [];
  const stashDir = path.join(root, STASH_DIRNAME);
  const stashed = []; // { rel, stash }

  // Copies every set-aside file back and removes the stash only when all of
  // them made it, so a failed copy never deletes the customer's only copy.
  const restoreStashed = () => {
    for (const { rel, stash } of stashed) {
      const abs = path.join(root, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.copyFileSync(stash, abs);
    }
    fs.rmSync(stashDir, { recursive: true, force: true });
  };
  const fail = (error, detail) => ({ ok: false, error, detail, migrated });

  // 1. Is this a git checkout at all? (Docker images and zip downloads are not.)
  const inside = await run('git', ['rev-parse', '--is-inside-work-tree'], { capture: true });
  if (!inside.ok) return fail('Not a git checkout, update this installation manually.', inside.output);

  // A stash left by an interrupted earlier run holds the customer's files while
  // the working tree may hold the defaults. Put them back before anything else.
  if (fs.existsSync(stashDir)) {
    for (const rel of listFiles(stashDir)) {
      stashed.push({ rel, stash: path.join(stashDir, rel) });
      log(`[update] restoring ${rel} from an interrupted earlier update`);
    }
    restoreStashed();
    stashed.length = 0;
  }

  // 2. npm rewrites package-lock.json locally; the shipped one is what counts.
  step('reset package-lock.json');
  const lockReset = await run('git', ['checkout', 'HEAD', '--', 'package-lock.json']);
  if (!lockReset.ok) log('[update] package-lock.json could not be reset, continuing.');

  // 3. Clear local changes to tracked customer files.
  const status = await run('git', ['status', '--porcelain=v1', '-z', '--', 'locales', 'assets'], { capture: true });
  if (!status.ok) return fail('git status failed', status.output);
  const entries = parsePorcelain(status.stdout);

  try {
    for (const entry of entries) {
      if (!LOCALE_FILE_RE.test(entry.file)) continue;
      if (isModified(entry)) {
        step(`move local edits of ${entry.file} into the customer layer`);
        await migrateLocale({ root, run, log }, entry.file);
        migrated.locales.push(entry.file);
      } else if (isDeleted(entry)) {
        step(`restore deleted ${entry.file}`);
        const r = await run('git', ['checkout', 'HEAD', '--', entry.file]);
        if (!r.ok) throw new Error(`git checkout ${entry.file} failed: ${r.output}`);
      }
    }

    for (const entry of entries) {
      if (!ASSET_FILE_RE.test(entry.file)) continue;
      if (isModified(entry)) {
        step(`set aside your ${entry.file}`);
        const stash = path.join(stashDir, entry.file);
        fs.mkdirSync(path.dirname(stash), { recursive: true });
        fs.copyFileSync(path.join(root, entry.file), stash);
        stashed.push({ rel: entry.file, stash });
        const r = await run('git', ['checkout', 'HEAD', '--', entry.file]);
        if (!r.ok) throw new Error(`git checkout ${entry.file} failed: ${r.output}`);
        migrated.assets.push(entry.file);
      } else if (isDeleted(entry)) {
        step(`restore deleted ${entry.file}`);
        const r = await run('git', ['checkout', 'HEAD', '--', entry.file]);
        if (!r.ok) throw new Error(`git checkout ${entry.file} failed: ${r.output}`);
      }
    }
  } catch (err) {
    restoreStashed();
    return fail('Preparing the update failed', err.message);
  }

  // 4. Pull. Fast-forward only: a local commit means someone works on this
  //    checkout by hand, and a merge is their call, not the update button's.
  step('git pull --ff-only');
  const pull = await run('git', ['pull', '--ff-only']);
  outputs.push(pull.output);
  // Put the customer's images back whether or not the pull worked. After a
  // successful pull assets/<name> is gitignored (or still tracked, then it is
  // simply modified again and the next update sets it aside again).
  restoreStashed();
  for (const { rel } of stashed) log(`[update] put your ${rel} back`);
  if (!pull.ok) return fail('git pull failed', pull.output);

  // 5. Dependencies, then undo npm's local rewrite of the lockfile again.
  if (install) {
    step('npm install --omit=dev');
    const npm = await run('npm', ['install', '--omit=dev']);
    outputs.push(npm.output);
    await run('git', ['checkout', 'HEAD', '--', 'package-lock.json']);
    if (!npm.ok) return fail('npm install failed', npm.output);
  }

  step('done');
  return { ok: true, output: outputs.filter(Boolean).join('\n').trim(), migrated };
}

module.exports = { runUpdate, createRunner, parsePorcelain, migrateLocale, STASH_DIRNAME, LEGACY_SUFFIX };
