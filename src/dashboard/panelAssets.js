/**
 * Panel logo and banner upload for the dashboard.
 *
 * Hosted customers have no shell on the server, so they cannot drop their own
 * image into assets/. These routes take the image over the dashboard instead:
 *
 *   size limit (route body parser) → type from content (magic bytes, strict
 *   SVG check) → ClamAV scan of the raw bytes (when configured) → sharp
 *   re-encode (metadata and appended data dropped, SVG rasterised) → atomic
 *   write under a generated name → panel.<slot>.file in config.jsonc →
 *   previous custom file of that slot removed → audit
 *
 * The routes are mounted on the /api router, so they run behind the same chain
 * as every other route (auth, origin check, CSRF, write rate limit). On top of
 * that each declares its permission, and only one upload is processed at a time.
 *
 * The bot reads config.jsonc at start, so the new image is picked up after the
 * next restart, exactly like a change saved in the config editor.
 */

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const express = require('express');

const { inspectConfig, stripJsonComments } = require('../config');
const { resolvePanelAsset } = require('../utils/assetResolver');
const { setJsoncString } = require('./jsoncPatch');
const { detectImageType, checkSvgSafety, sanitizeImage, ImageRejectedError } = require('./imageSanitizer');
const { clamavConfigFromEnv, describeTarget, scanBuffer, pingClamd, ClamavUnavailableError } = require('./clamav');

const DEFAULT_MAX_MB = 5;
const MIN_MAX_MB = 1;
// The hosted dashboard sits behind msk-shop, whose proxy buffers at most 10 MB of
// a request body, and Discord takes at most 10 MB per attachment.
const MAX_MAX_MB = 10;

// Only names this module generates. Cleanup matches on this, so a shipped file or
// one the customer put there by hand is never deleted.
const CUSTOM_FILE_RE = /^custom-(logo|banner)-[0-9a-f]{16}\.(png|jpg|webp|gif)$/;

// Previews are served for raster files only. An SVG is never sent to the browser.
const PREVIEW_TYPES = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const MAX_PREVIEW_BYTES = 25 * 1024 * 1024;

/**
 * The slot from the URL mapped to constants. The URL value is only ever compared,
 * it never becomes part of a path or a config key.
 * @param {string} slot
 */
// Values from outside (a ClamAV signature, a user id) are logged without line
// breaks or control characters, so they cannot forge extra log lines.
const logSafe = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').slice(0, 200);

function slotSpec(slot) {
  switch (slot) {
    case 'logo':
      return { slot: 'logo', configPath: ['panel', 'logo', 'file'], defaultFile: 'logo.png', maxWidth: 1024, maxHeight: 1024 };
    case 'banner':
      return { slot: 'banner', configPath: ['panel', 'banner', 'file'], defaultFile: 'banner.png', maxWidth: 2048, maxHeight: 2048 };
    default:
      return null;
  }
}

/**
 * Upload limit in bytes from ASSET_UPLOAD_MAX_MB (default 5, clamped to 1..10).
 * @returns {{bytes: number, mb: number, warning: string|null}}
 */
function uploadLimitFromEnv(env = process.env) {
  const raw = String(env.ASSET_UPLOAD_MAX_MB ?? '').trim();
  if (raw === '') return { bytes: DEFAULT_MAX_MB * 1024 * 1024, mb: DEFAULT_MAX_MB, warning: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return {
      bytes: DEFAULT_MAX_MB * 1024 * 1024,
      mb: DEFAULT_MAX_MB,
      warning: `ASSET_UPLOAD_MAX_MB "${raw}" is not a number, using ${DEFAULT_MAX_MB} MB.`,
    };
  }
  const mb = Math.min(MAX_MAX_MB, Math.max(MIN_MAX_MB, n));
  return {
    bytes: Math.floor(mb * 1024 * 1024),
    mb,
    warning: mb !== n ? `ASSET_UPLOAD_MAX_MB ${raw} is outside ${MIN_MAX_MB}..${MAX_MAX_MB}, using ${mb} MB.` : null,
  };
}

/** Generated, content-addressed name: custom-<slot>-<16 hex>.<ext>. */
function customFileName(slot, ext, buffer) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  return `custom-${slot}-${hash}.${ext}`;
}

/** Temp file in the same directory, then rename: readers never see half a file. */
async function writeFileAtomic(dir, name, buffer) {
  const final = path.join(dir, name);
  const tmp = path.join(dir, `.${name}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.writeFile(tmp, buffer, { flag: 'wx' });
    await fs.rename(tmp, final);
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
}

/**
 * Remove the generated files of one slot, except `keep`. Names come from the
 * directory listing and must match CUSTOM_FILE_RE.
 * @returns {Promise<string[]>} removed names
 */
async function removeCustomFiles(dir, slot, keep = null) {
  const entries = await fs.readdir(dir).catch(() => []);
  const removed = [];
  for (const name of entries) {
    const m = CUSTOM_FILE_RE.exec(name);
    if (!m || m[1] !== slot || name === keep) continue;
    await fs.unlink(path.join(dir, name)).then(() => removed.push(name), () => {});
  }
  return removed;
}

/** panel.<slot>.file from the config on disk, or the default when unset. */
async function configuredFile(configFile, spec) {
  const text = await fs.readFile(configFile, 'utf-8').catch(() => null);
  if (text === null) return spec.defaultFile;
  try {
    const cfg = JSON.parse(stripJsonComments(text));
    const value = spec.configPath.reduce((node, key) => (node == null ? undefined : node[key]), cfg);
    return typeof value === 'string' && value !== '' ? value : spec.defaultFile;
  } catch {
    return spec.defaultFile;
  }
}

/**
 * Prepare (but do not write) the config change. Uses the bot's own parser and
 * refuses a document the bot would not boot with, as the config editor does.
 * Pending items (a panel channel not filled in yet, …) do not block: those do not
 * stop the bot, and a fresh install should be able to set its logo first.
 * @returns {Promise<{status: 'patch', text: string, previous: string}|{status: 'missing'}|{status: 'error', error: string}>}
 */
async function prepareConfigPatch(configFile, spec, fileName) {
  const text = await fs.readFile(configFile, 'utf-8').catch(() => null);
  if (text === null) return { status: 'missing' };

  const patched = setJsoncString(text, spec.configPath, fileName);
  if (!patched.ok && patched.reason === 'syntax') {
    return { status: 'error', error: 'config.jsonc has a syntax error. Fix it in the config editor first, then upload again.' };
  }
  if (!patched.ok) return { status: 'missing' };

  const fatal = inspectConfig(JSON.parse(stripJsonComments(patched.text))).fatal
    .filter(e => !e.startsWith('Environment variable'));
  if (fatal.length > 0) {
    return { status: 'error', error: `config.jsonc has errors that stop the bot from starting. Fix them first:\n${fatal.join('\n')}` };
  }
  return { status: 'patch', text: patched.text, previous: patched.previous };
}

/** Same as the config editor's save: keep a .bak, then write. */
async function writeConfig(configFile, text) {
  await fs.copyFile(configFile, `${configFile}.bak`).catch(() => {});
  await fs.writeFile(configFile, text, 'utf-8');
}

/**
 * Mount the panel asset routes on the (already secured) API router.
 *
 * @param {import('express').Router} api
 * @param {object} deps
 * @param {Function} deps.requirePermission
 * @param {(req, action: string, target?: string, detail?: object) => void} deps.audit
 * @param {string} deps.configFile absolute path of config.jsonc
 * @param {string} deps.assetsDir absolute path of assets/
 * @param {NodeJS.ProcessEnv} [deps.env]
 * @param {(buf: Buffer) => Promise<{clean: boolean, signature?: string}>} [deps.scan]
 *        override for tests; by default built from CLAMAV_* in env, or none
 * @param {Pick<Console, 'warn'|'error'|'log'>} [deps.logger]
 */
function registerPanelAssetRoutes(api, { requirePermission, audit, configFile, assetsDir, env = process.env, scan, logger = console }) {
  const limit = uploadLimitFromEnv(env);
  if (limit.warning) logger.warn(`[Dashboard] ${limit.warning}`);

  // Scanner: injected (tests), configured via env, or none at all.
  let scanner = scan ?? null;
  if (!scanner) {
    const clamCfg = clamavConfigFromEnv(env);
    if (clamCfg) {
      scanner = (buf) => scanBuffer(buf, clamCfg);
      if (clamCfg.invalid) {
        logger.error(`[Dashboard] ClamAV is misconfigured (${clamCfg.invalid}). Image uploads are refused until this is fixed.`);
      } else {
        pingClamd(clamCfg).then((ok) => {
          if (ok) logger.log(`[Dashboard] Image uploads are virus scanned with ClamAV (${describeTarget(clamCfg)}).`);
          else logger.warn(`[Dashboard] ClamAV (${describeTarget(clamCfg)}) does not answer. Image uploads are refused until it does.`);
        });
      }
    } else {
      logger.log('[Dashboard] Image uploads are not virus scanned (no CLAMAV_SOCKET or CLAMAV_HOST set). They are still re-encoded.');
    }
  }

  // One upload at a time. Decoding is the expensive part, and nobody needs to
  // replace logo and banner in the same second.
  let busy = false;
  const oneAtATime = (req, res, next) => {
    if (busy) return res.status(429).json({ error: 'Another image is being processed. Try again in a moment.' });
    busy = true;
    res.once('close', () => { busy = false; });
    next();
  };

  // Raw body for this route only, with its own limit. The global JSON limit stays
  // as it is. inflate: false refuses compressed bodies (no gzip bomb).
  const rawParser = express.raw({ type: 'application/octet-stream', limit: limit.bytes, inflate: false });
  const readUpload = (req, res, next) => rawParser(req, res, (err) => {
    if (!err) return next();
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: `The image is larger than ${limit.mb} MB.` });
    }
    if (err.type === 'encoding.unsupported') {
      return res.status(415).json({ error: 'Compressed uploads are not accepted.' });
    }
    return res.status(400).json({ error: 'The upload could not be read.' });
  });

  const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  const slotOr404 = (req, res) => {
    const spec = slotSpec(req.params.slot);
    if (!spec) res.status(404).json({ error: 'Unknown image slot.' });
    return spec;
  };

  // ── State for the config form ─────────────────────────────────────────────
  api.get('/panel-assets', requirePermission(['config.view', 'config.edit']), asyncRoute(async (req, res) => {
    const slots = {};
    for (const slot of ['logo', 'banner']) {
      const spec = slotSpec(slot);
      const file = await configuredFile(configFile, spec);
      slots[slot] = {
        file,
        custom: CUSTOM_FILE_RE.test(file),
        exists: resolvePanelAsset(file, assetsDir) !== null,
        defaultFile: spec.defaultFile,
      };
    }
    res.json({ maxBytes: limit.bytes, maxMb: limit.mb, scanned: scanner !== null, slots });
  }));

  // ── Preview of the image the bot would use ────────────────────────────────
  // Same resolution as the bot (assets/<file>, then assets/default/<file>).
  // The bytes are served only when they are one of the raster types, with the
  // Content-Type taken from the bytes, never from the file name.
  api.get('/panel-assets/:slot/preview', requirePermission(['config.view', 'config.edit']), asyncRoute(async (req, res) => {
    const spec = slotOr404(req, res);
    if (!spec) return;
    const resolved = resolvePanelAsset(await configuredFile(configFile, spec), assetsDir);
    if (!resolved) return res.status(404).json({ error: 'No image found.' });

    // One handle for the size check and the read, so the file cannot change in between.
    const handle = await fs.open(resolved, 'r').catch(() => null);
    if (!handle) return res.status(404).json({ error: 'No image found.' });
    let buf;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_PREVIEW_BYTES) return res.status(404).json({ error: 'No image found.' });
      buf = await handle.readFile();
    } finally {
      await handle.close();
    }
    const type = detectImageType(buf);
    const mime = PREVIEW_TYPES[type];
    if (!mime) return res.status(415).json({ error: 'This file cannot be previewed.' });

    res.setHeader('Content-Type', mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline');
    res.send(buf);
  }));

  // ── Upload ────────────────────────────────────────────────────────────────
  api.post('/panel-assets/:slot',
    requirePermission('config.edit'),
    oneAtATime,
    readUpload,
    asyncRoute(async (req, res) => {
      const spec = slotOr404(req, res);
      if (!spec) return;

      // express.raw() gives a Buffer; anything else (an array or a parsed object
      // from another body parser) is refused before any length or byte access.
      const body = req.body;
      if (Array.isArray(body) || typeof body === 'string' || !Buffer.isBuffer(body)) {
        return res.status(415).json({ error: 'Send the image as application/octet-stream.' });
      }
      const input = Buffer.from(body);
      if (input.length === 0) return res.status(400).json({ error: 'Empty upload.' });
      if (input.length > limit.bytes) return res.status(413).json({ error: `The image is larger than ${limit.mb} MB.` });

      // 1. Type from the content.
      const type = detectImageType(input);
      if (!type) {
        return res.status(415).json({ error: 'Only PNG, JPEG, GIF, WebP and SVG images are allowed.' });
      }
      if (type === 'svg') {
        const svg = checkSvgSafety(input);
        if (!svg.ok) return res.status(422).json({ error: svg.reason });
      }

      // 2. Virus scan of the raw bytes. A configured scanner that cannot answer
      //    means the file is refused (fail closed).
      if (scanner) {
        let verdict;
        try {
          verdict = await scanner(input);
        } catch (err) {
          const reason = err instanceof ClamavUnavailableError ? err.message : 'ClamAV failed.';
          logger.error(`[Dashboard] Upload refused, virus scan failed: ${reason}`);
          return res.status(503).json({ error: 'The virus scanner is not available, so the image was not accepted. Try again later.' });
        }
        if (!verdict.clean) {
          audit(req, 'panel.asset.infected', spec.slot, { signature: verdict.signature, type, bytes: input.length });
          logger.warn(`[Dashboard] Upload refused, ClamAV found ${logSafe(verdict.signature)} (slot ${spec.slot}, user ${logSafe(req.auth?.userId)}).`);
          return res.status(422).json({ error: `The virus scanner flagged this file (${verdict.signature}). It was not stored.` });
        }
      }

      // 3. Re-encode.
      let image;
      try {
        image = await sanitizeImage(input, type, spec);
      } catch (err) {
        if (err instanceof ImageRejectedError) return res.status(err.status).json({ error: err.message });
        throw err;
      }

      // 4. Prepare the config change before anything is written, so a config the
      //    bot could not boot with leaves no orphaned file behind.
      const fileName = customFileName(spec.slot, image.ext, image.buffer);
      const patch = await prepareConfigPatch(configFile, spec, fileName);
      if (patch.status === 'error') return res.status(409).json({ error: patch.error });

      // 5. Store, point the config at it, drop the previous upload of this slot.
      await writeFileAtomic(assetsDir, fileName, image.buffer);
      if (patch.status === 'patch') await writeConfig(configFile, patch.text);
      await removeCustomFiles(assetsDir, spec.slot, fileName);

      audit(req, 'panel.asset.upload', spec.slot, {
        file: fileName,
        type,
        format: image.format,
        bytes: input.length,
        stored: image.buffer.length,
        scanned: scanner !== null,
      });
      res.json({
        ok: true,
        file: fileName,
        configUpdated: patch.status === 'patch',
        width: image.width,
        height: image.height,
      });
    }),
  );

  // ── Back to the default image ─────────────────────────────────────────────
  api.delete('/panel-assets/:slot', requirePermission('config.edit'), asyncRoute(async (req, res) => {
    const spec = slotOr404(req, res);
    if (!spec) return;

    const patch = await prepareConfigPatch(configFile, spec, spec.defaultFile);
    if (patch.status === 'error') return res.status(409).json({ error: patch.error });
    if (patch.status === 'patch') await writeConfig(configFile, patch.text);
    const removed = await removeCustomFiles(assetsDir, spec.slot);

    audit(req, 'panel.asset.reset', spec.slot, { file: spec.defaultFile, removed });
    res.json({ ok: true, file: spec.defaultFile, configUpdated: patch.status === 'patch' });
  }));
}

module.exports = {
  CUSTOM_FILE_RE,
  slotSpec,
  uploadLimitFromEnv,
  customFileName,
  writeFileAtomic,
  removeCustomFiles,
  prepareConfigPatch,
  registerPanelAssetRoutes,
};
