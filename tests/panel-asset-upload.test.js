/**
 * Panel logo/banner upload: type detection, sanitising re-encode, the clamd
 * client and the dashboard routes (src/dashboard/{imageSanitizer,clamav,
 * jsoncPatch,panelAssets}.js).
 *
 * This is a security path: an uploaded file ends up on disk and in a Discord
 * message. The tests pin down what must never get through (a non-image, an SVG
 * with script, metadata, an appended payload, a decompression bomb, a file the
 * scanner flags) and that a configured but broken scanner refuses the upload.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');

const sharp = require('sharp');
const express = require('express');

const {
  detectImageType, checkSvgSafety, sanitizeImage, ImageRejectedError,
} = require('../src/dashboard/imageSanitizer');
const { scanBuffer, clamavConfigFromEnv, pingClamd, ClamavUnavailableError } = require('../src/dashboard/clamav');
const { setJsoncString } = require('../src/dashboard/jsoncPatch');
const { registerPanelAssetRoutes, uploadLimitFromEnv, removeCustomFiles, CUSTOM_FILE_RE } = require('../src/dashboard/panelAssets');
const { hasPermission } = require('../src/dashboard/permissions');
const { resolvePanelAsset } = require('../src/utils/assetResolver');

const BOUNDS = { maxWidth: 1024, maxHeight: 1024 };
const solid = (width, height, background = '#3366cc', channels = 3) =>
  sharp({ create: { width, height, channels, background } });

const SVG_OK = Buffer.from(
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" width="24" height="24">' +
  '<defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs>' +
  '<circle cx="12" cy="12" r="10" fill="url(#g)"/><use xlink:href="#g"/></svg>\n',
);

// ── Type detection ──────────────────────────────────────────────────────────

test('every allowed type is detected from its content', async () => {
  const img = solid(16, 16);
  assert.equal(detectImageType(await img.clone().png().toBuffer()), 'png');
  assert.equal(detectImageType(await img.clone().jpeg().toBuffer()), 'jpeg');
  assert.equal(detectImageType(await img.clone().gif().toBuffer()), 'gif');
  assert.equal(detectImageType(await img.clone().webp().toBuffer()), 'webp');
  assert.equal(detectImageType(SVG_OK), 'svg');
});

test('a renamed non-image is not an image, whatever its name says', () => {
  // What a "logo.png" that is really a script or an archive looks like.
  assert.equal(detectImageType(Buffer.from('#!/bin/sh\nrm -rf /\n')), null);
  assert.equal(detectImageType(Buffer.from('PK\x03\x04 zip archive')), null);
  assert.equal(detectImageType(Buffer.from('<html><body>hi</body></html>')), null);
  assert.equal(detectImageType(Buffer.from('RIFF\0\0\0\0AVI LIST')), null); // RIFF but not WebP
  assert.equal(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47])), null); // truncated PNG magic
  assert.equal(detectImageType(Buffer.alloc(0)), null);
  assert.equal(detectImageType('not a buffer'), null);
  // Not UTF-8 → not an SVG either.
  assert.equal(detectImageType(Buffer.from([0x3c, 0x73, 0x76, 0x67, 0xff, 0xfe, 0x3e])), null);
});

test('a clean SVG passes the strict check', () => {
  assert.deepEqual(checkSvgSafety(SVG_OK), { ok: true });
});

test('SVGs with script, handlers, external references or entities are refused', () => {
  const svg = (inner, head = '') => Buffer.from(`${head}<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`);
  const bad = [
    svg('<script>alert(1)</script>'),
    svg('<SCRIPT type="text/javascript">alert(1)</SCRIPT>'),
    svg('<rect onload="alert(1)" width="1" height="1"/>'),
    svg('<a href="javascript:alert(1)"><rect/></a>'),
    svg('<foreignObject><iframe src="https://evil.example"/></foreignObject>'),
    svg('<image href="https://evil.example/track.png"/>'),
    svg('<image xlink:href="file:///etc/passwd"/>'),
    svg('<image href="data:image/png;base64,AAAA"/>'),
    svg('<style>@import url(https://evil.example/x.css);</style>'),
    svg('<rect style="fill:url(https://evil.example/x)"/>'),
    svg('<rect style="fill:url( \'https://evil.example/x\')"/>'),
    svg('<xi:include href="/etc/passwd"/>'),
    svg('<text>&xxe;</text>', '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'),
  ];
  for (const buf of bad) {
    const r = checkSvgSafety(buf);
    assert.equal(r.ok, false, `must be refused: ${buf.toString()}`);
    assert.ok(r.reason.length > 0);
  }
  // A local url(#id) with quotes and spaces stays allowed.
  assert.equal(checkSvgSafety(svg('<rect style="fill:url( \'#grad\')"/>')).ok, true);
});

// ── Re-encode ───────────────────────────────────────────────────────────────

test('EXIF, GPS, XMP and ICC do not survive the re-encode', async () => {
  const input = await solid(64, 48).jpeg()
    .withExif({
      IFD0: { Copyright: 'SECRET-OWNER', ImageDescription: 'SECRET-DESC' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '49/1 28/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '8/1 36/1 0/1' },
    })
    .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>SECRET-XMP</dc:creator></rdf:Description></rdf:RDF></x:xmpmeta>')
    .withIccProfile('p3')
    .toBuffer();

  // The input really carries all of it, GPS IFD pointer (tag 0x8825) included.
  const inMeta = await sharp(input).metadata();
  assert.ok(inMeta.exif && inMeta.xmp && inMeta.icc, 'fixture must carry metadata');
  const gpsTag = (b) => b.includes(Buffer.from([0x88, 0x25])) || b.includes(Buffer.from([0x25, 0x88]));
  assert.ok(gpsTag(inMeta.exif), 'fixture must carry a GPS IFD');
  assert.ok(input.includes('SECRET-OWNER') && input.includes('SECRET-XMP'));

  const out = await sanitizeImage(input, 'jpeg', BOUNDS);
  assert.equal(out.format, 'jpeg');
  const outMeta = await sharp(out.buffer).metadata();
  assert.equal(outMeta.exif, undefined, 'EXIF (and with it GPS) must be gone');
  assert.equal(outMeta.xmp, undefined, 'XMP must be gone');
  assert.equal(outMeta.icc, undefined, 'ICC profile must be gone');
  assert.equal(outMeta.iptc, undefined);
  assert.ok(!out.buffer.includes('SECRET'), 'no metadata string may survive');
  assert.ok(!out.buffer.includes('Exif\0\0'), 'no EXIF segment');
});

test('a polyglot (GIF with an appended script) comes out as a clean PNG', async () => {
  const gif = await solid(32, 32).gif().toBuffer();
  const poly = Buffer.concat([gif, Buffer.from('<script>alert(document.cookie)</script>')]);
  assert.equal(detectImageType(poly), 'gif'); // the header passes …

  const out = await sanitizeImage(poly, 'gif', BOUNDS); // … the payload does not
  assert.equal(out.format, 'png');
  assert.ok(out.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
  assert.ok(!out.buffer.includes('<script'), 'the appended payload must not survive');
});

test('a header that is only a disguise is refused', async () => {
  const fake = Buffer.concat([Buffer.from('GIF89a'), Buffer.from('<script>alert(1)</script>')]);
  await assert.rejects(sanitizeImage(fake, 'gif', BOUNDS), (err) => err instanceof ImageRejectedError && err.status === 422);
  const truncated = (await solid(64, 64).jpeg().toBuffer()).subarray(0, 200);
  await assert.rejects(sanitizeImage(truncated, 'jpeg', BOUNDS), (err) => err instanceof ImageRejectedError);
});

test('a decompression bomb is refused before it is decoded', async () => {
  // 10000 x 10000 of one colour: a few hundred KB on disk, 300 MB as pixels.
  const bomb = await solid(10000, 10000, '#000').png({ compressionLevel: 9 }).toBuffer();
  assert.ok(bomb.length < 1024 * 1024);
  await assert.rejects(sanitizeImage(bomb, 'png', BOUNDS), (err) => err instanceof ImageRejectedError && err.status === 413);
});

test('SVG is always rasterised to PNG and rendered at a usable size', async () => {
  const out = await sanitizeImage(SVG_OK, 'svg', BOUNDS);
  assert.equal(out.format, 'png');
  assert.equal(out.ext, 'png');
  assert.ok(!out.buffer.includes('<svg'));
  assert.ok(out.width > 24 && out.width <= BOUNDS.maxWidth, `rendered width ${out.width}`);
});

test('output formats: large images shrink, small ones are not upscaled, animation is kept', async () => {
  const big = await sanitizeImage(await solid(3000, 1000).png().toBuffer(), 'png', BOUNDS);
  assert.equal(big.width, 1024);
  assert.equal(big.height, 341);

  const small = await sanitizeImage(await solid(100, 50).png().toBuffer(), 'png', BOUNDS);
  assert.deepEqual([small.width, small.height], [100, 50]);

  assert.equal((await sanitizeImage(await solid(20, 20).webp().toBuffer(), 'webp', BOUNDS)).format, 'webp');
  assert.equal((await sanitizeImage(await solid(20, 20).gif().toBuffer(), 'gif', BOUNDS)).format, 'png');

  const frames = await Promise.all(['#f00', '#0f0', '#00f'].map(c => solid(20, 20, c).png().toBuffer()));
  const anim = await sharp(frames, { join: { animated: true } }).gif().toBuffer();
  const out = await sanitizeImage(anim, 'gif', BOUNDS);
  assert.equal(out.format, 'gif');
  assert.equal(out.animated, true);
  assert.equal((await sharp(out.buffer, { animated: true }).metadata()).pages, 3);
});

// ── clamd client against a fake clamd ──────────────────────────────────────

/** A fake clamd that decodes zINSTREAM framing and answers via `reply(data)`. */
function fakeClamd(reply, socketPath = null) {
  const received = [];
  const server = net.createServer((sock) => {
    let buf = Buffer.alloc(0);
    let header = false;
    const chunks = [];
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!header) {
        const nul = buf.indexOf(0);
        if (nul < 0) return;
        const cmd = buf.subarray(0, nul).toString();
        buf = buf.subarray(nul + 1);
        header = true;
        if (cmd === 'zPING') { sock.end('PONG\0'); return; }
        assert.equal(cmd, 'zINSTREAM');
      }
      while (buf.length >= 4) {
        const len = buf.readUInt32BE(0);
        if (len === 0) {
          const data = Buffer.concat(chunks);
          received.push(data);
          const answer = reply(data);
          if (answer !== null) sock.end(`${answer}\0`);
          return;
        }
        if (buf.length < 4 + len) return;
        chunks.push(buf.subarray(4, 4 + len));
        buf = buf.subarray(4 + len);
      }
    });
    sock.on('error', () => {});
  });
  if (socketPath) {
    return new Promise((resolve) => server.listen(socketPath, () => resolve({ server, received, cfg: { socketPath } })));
  }
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ server, received, cfg: { host: '127.0.0.1', port: server.address().port } });
  }));
}

test('clamd OK: the whole buffer arrives in size-prefixed chunks and counts as clean', async () => {
  const { server, received, cfg } = await fakeClamd(() => 'stream: OK');
  try {
    const payload = Buffer.alloc(200 * 1024, 7); // spans several 64 KB chunks
    assert.deepEqual(await scanBuffer(payload, cfg), { clean: true });
    assert.ok(received[0].equals(payload), 'clamd must receive exactly the uploaded bytes');
    assert.equal(await pingClamd(cfg), true);
  } finally {
    server.close();
  }
});

test('clamd FOUND is reported with its signature', async () => {
  const { server, cfg } = await fakeClamd(() => 'stream: Eicar-Test-Signature FOUND');
  try {
    assert.deepEqual(await scanBuffer(Buffer.from('x'), cfg), { clean: false, signature: 'Eicar-Test-Signature' });
  } finally {
    server.close();
  }
});

test('clamd ERROR, unreachable and timeout all throw (the caller fails closed)', async () => {
  const errSrv = await fakeClamd(() => 'INSTREAM size limit exceeded. ERROR');
  await assert.rejects(scanBuffer(Buffer.from('x'), errSrv.cfg), ClamavUnavailableError);
  errSrv.server.close();

  // A port that nobody listens on.
  const probe = net.createServer();
  await new Promise(r => probe.listen(0, '127.0.0.1', r));
  const deadPort = probe.address().port;
  await new Promise(r => probe.close(r));
  await assert.rejects(scanBuffer(Buffer.from('x'), { host: '127.0.0.1', port: deadPort }), ClamavUnavailableError);
  assert.equal(await pingClamd({ host: '127.0.0.1', port: deadPort }), false);

  const silent = await fakeClamd(() => null); // reads everything, never answers
  const started = Date.now();
  await assert.rejects(scanBuffer(Buffer.from('x'), silent.cfg, { timeoutMs: 300 }), /did not answer/);
  assert.ok(Date.now() - started < 3000);
  silent.server.close();

  await assert.rejects(scanBuffer(Buffer.from('x'), { invalid: 'bad port' }), ClamavUnavailableError);
});

test('clamd over a UNIX socket', { skip: process.platform === 'win32' && 'UNIX sockets only' }, async () => {
  const sockPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tb-clam-')), 'clamd.ctl');
  const { server, received, cfg } = await fakeClamd(() => 'stream: OK', sockPath);
  try {
    assert.deepEqual(await scanBuffer(Buffer.from('payload'), cfg), { clean: true });
    assert.equal(received[0].toString(), 'payload');
  } finally {
    server.close();
  }
});

test('ClamAV settings from .env', () => {
  assert.equal(clamavConfigFromEnv({}), null);
  assert.deepEqual(clamavConfigFromEnv({ CLAMAV_SOCKET: '/var/run/clamav/clamd.ctl', CLAMAV_HOST: 'x' }), { socketPath: '/var/run/clamav/clamd.ctl' });
  assert.deepEqual(clamavConfigFromEnv({ CLAMAV_HOST: '127.0.0.1' }), { host: '127.0.0.1', port: 3310 });
  assert.deepEqual(clamavConfigFromEnv({ CLAMAV_HOST: 'clam', CLAMAV_PORT: '3311' }), { host: 'clam', port: 3311 });
  assert.ok(clamavConfigFromEnv({ CLAMAV_HOST: 'clam', CLAMAV_PORT: 'abc' }).invalid);
});

// ── Upload limit, config patch, path containment ────────────────────────────

test('ASSET_UPLOAD_MAX_MB: default 5, clamped to 1..10', () => {
  assert.equal(uploadLimitFromEnv({}).bytes, 5 * 1024 * 1024);
  assert.equal(uploadLimitFromEnv({ ASSET_UPLOAD_MAX_MB: '2' }).bytes, 2 * 1024 * 1024);
  assert.equal(uploadLimitFromEnv({ ASSET_UPLOAD_MAX_MB: '500' }).mb, 10);
  assert.equal(uploadLimitFromEnv({ ASSET_UPLOAD_MAX_MB: '0.1' }).mb, 1);
  const bad = uploadLimitFromEnv({ ASSET_UPLOAD_MAX_MB: 'lots' });
  assert.equal(bad.mb, 5);
  assert.ok(bad.warning);
});

const CONFIG_TEXT = `{
  // ─── Panel ───
  "panel": {
    "interactionType": "BUTTON", // keep me
    "logo": {
      "enabled": true,             // Set to true to show a logo
      "file": "logo.png"           // Filename inside the assets/ folder
    },
    "banner": { "enabled": false, "file": "banner.png" }
  },
  "url": "https://example.com/x" // a // inside a string is no comment
}
`;

test('setJsoncString changes one value and keeps every comment', () => {
  const r = setJsoncString(CONFIG_TEXT, ['panel', 'logo', 'file'], 'custom-logo-0123456789abcdef.png');
  assert.equal(r.ok, true);
  assert.equal(r.previous, 'logo.png');
  assert.equal(r.text, CONFIG_TEXT.replace('"logo.png"', '"custom-logo-0123456789abcdef.png"'));
  assert.deepEqual(setJsoncString(CONFIG_TEXT, ['panel', 'nope', 'file'], 'x'), { ok: false, reason: 'missing' });
  assert.deepEqual(setJsoncString(CONFIG_TEXT, ['panel', 'logo', 'enabled'], 'x'), { ok: false, reason: 'missing' }); // not a string
  assert.deepEqual(setJsoncString('{ "panel": ', ['panel'], 'x'), { ok: false, reason: 'syntax' });
});

test('a panel image name cannot leave the assets folder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-assets-'));
  fs.mkdirSync(path.join(dir, 'assets', 'default'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.env'), 'TOKEN=secret');
  fs.writeFileSync(path.join(dir, 'assets', 'logo.png'), 'x');
  const assets = path.join(dir, 'assets');
  assert.equal(resolvePanelAsset('../.env', assets), null);
  assert.equal(resolvePanelAsset('../../.env', assets), null); // via default/
  assert.equal(resolvePanelAsset(path.join(dir, '.env'), assets), null); // absolute
  assert.equal(resolvePanelAsset('logo.png', assets), path.join(assets, 'logo.png'));
});

test('cleanup only touches generated names of the same slot', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-assets-'));
  const names = ['logo.png', 'custom-logo-0000000000000000.png', 'custom-logo-1111111111111111.jpg',
    'custom-banner-2222222222222222.png', 'custom-logo-evil.png', 'custom-logo-3333333333333333.svg'];
  for (const n of names) fs.writeFileSync(path.join(dir, n), 'x');
  const removed = await removeCustomFiles(dir, 'logo', 'custom-logo-1111111111111111.jpg');
  assert.deepEqual(removed, ['custom-logo-0000000000000000.png']);
  assert.deepEqual(fs.readdirSync(dir).sort(), names.filter(n => n !== 'custom-logo-0000000000000000.png').sort());
  assert.ok(!CUSTOM_FILE_RE.test('custom-logo-3333333333333333.svg'));
});

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * The asset routes on a minimal app. Auth comes from a test header; the
 * permission check is the dashboard's own hasPermission, exactly as in
 * server.js. Origin/CSRF sit in front of the whole /api router in server.js and
 * are covered by tests/dashboard-security.test.js.
 */
// The shipped example: a real config, with comments, that has only "pending"
// placeholders (those must not block an upload on a fresh install).
const ROUTE_CONFIG = fs.readFileSync(path.resolve(__dirname, '../config/config.example.jsonc'), 'utf-8');

async function startApp({ scan, env = {}, config = ROUTE_CONFIG } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-upload-'));
  const assetsDir = path.join(root, 'assets');
  fs.mkdirSync(path.join(assetsDir, 'default'), { recursive: true });
  fs.writeFileSync(path.join(assetsDir, 'default', 'logo.png'), await solid(8, 8).png().toBuffer());
  const configFile = path.join(root, 'config.jsonc');
  fs.writeFileSync(configFile, config);

  const audits = [];
  const logs = [];
  const logger = { log: m => logs.push(m), warn: m => logs.push(m), error: m => logs.push(m) };

  const app = express();
  app.use(express.json({ limit: '64kb' }));
  const api = express.Router();
  api.use((req, res, next) => {
    req.auth = { userId: '111111111111111111', guildId: '1', permissions: (req.headers['x-test-perms'] || '').split(',').filter(Boolean) };
    next();
  });
  const requirePermission = (required) => (req, res, next) =>
    hasPermission(req.auth.permissions, required) ? next() : res.status(403).json({ error: 'forbidden' });
  const audit = (req, action, target, detail) => audits.push({ action, target, detail, actor: req.auth.userId });

  registerPanelAssetRoutes(api, { requirePermission, audit, configFile, assetsDir, env, scan, logger });
  app.use('/api', api);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => res.status(500).json({ error: String(err.message) }));

  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (method, p, { body, perms = 'config.edit', type = 'application/octet-stream' } = {}) =>
    fetch(`${base}${p}`, {
      method,
      headers: { 'x-test-perms': perms, ...(body ? { 'content-type': type } : {}) },
      body,
    });
  return { server, base, call, audits, logs, assetsDir, configFile };
}

test('upload: stored under a generated name, config updated, comments kept, audited', async () => {
  const t = await startApp();
  try {
    const png = await solid(300, 100).png().toBuffer();
    const res = await t.call('POST', '/panel-assets/logo', { body: png });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.file, /^custom-logo-[0-9a-f]{16}\.png$/);
    assert.equal(body.configUpdated, true);

    const stored = fs.readFileSync(path.join(t.assetsDir, body.file));
    assert.equal(detectImageType(stored), 'png');
    const cfgText = fs.readFileSync(t.configFile, 'utf-8');
    assert.equal(cfgText, ROUTE_CONFIG.replace('"logo.png"', JSON.stringify(body.file)));
    assert.ok(fs.existsSync(`${t.configFile}.bak`));
    assert.deepEqual(t.audits.map(a => [a.action, a.target]), [['panel.asset.upload', 'logo']]);
    assert.equal(t.audits[0].detail.file, body.file);
    assert.ok(t.logs.some(l => /not virus scanned/.test(l)), 'the missing scanner is logged once at start');

    // Replacing it removes the previous upload of the slot, nothing else.
    const res2 = await t.call('POST', '/panel-assets/logo', { body: await solid(50, 50, '#00ff00').jpeg().toBuffer() });
    const body2 = await res2.json();
    assert.match(body2.file, /^custom-logo-[0-9a-f]{16}\.jpg$/);
    assert.ok(!fs.existsSync(path.join(t.assetsDir, body.file)));
    assert.ok(fs.existsSync(path.join(t.assetsDir, 'default', 'logo.png')));
    assert.deepEqual(fs.readdirSync(t.assetsDir).filter(n => n.startsWith('.')), [], 'no temp file left');

    // Preview serves what the bot would use, typed from the bytes.
    const prev = await t.call('GET', '/panel-assets/logo/preview');
    assert.equal(prev.status, 200);
    assert.equal(prev.headers.get('content-type'), 'image/jpeg');
    assert.equal(prev.headers.get('x-content-type-options'), 'nosniff');

    // Reset: back to logo.png, generated file gone, audited.
    const reset = await t.call('DELETE', '/panel-assets/logo');
    assert.equal(reset.status, 200);
    assert.match(fs.readFileSync(t.configFile, 'utf-8'), /"file": "logo.png"/);
    assert.deepEqual(fs.readdirSync(t.assetsDir).filter(n => CUSTOM_FILE_RE.test(n)), []);
    assert.equal(t.audits.at(-1).action, 'panel.asset.reset');
  } finally {
    t.server.close();
  }
});

test('upload: an SVG is stored as PNG, never as SVG', async () => {
  const t = await startApp();
  try {
    const res = await t.call('POST', '/panel-assets/banner', { body: SVG_OK });
    assert.equal(res.status, 200);
    const { file } = await res.json();
    assert.match(file, /^custom-banner-[0-9a-f]{16}\.png$/);
    assert.equal(detectImageType(fs.readFileSync(path.join(t.assetsDir, file))), 'png');
    assert.deepEqual(fs.readdirSync(t.assetsDir).filter(n => /svg/i.test(n)), []);

    const evil = await t.call('POST', '/panel-assets/banner', { body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') });
    assert.equal(evil.status, 422);
  } finally {
    t.server.close();
  }
});

test('upload: wrong type, wrong content type, unknown slot and too large are refused, nothing stored', async () => {
  const t = await startApp({ env: { ASSET_UPLOAD_MAX_MB: '1' } });
  try {
    assert.equal((await t.call('POST', '/panel-assets/logo', { body: Buffer.from('#!/bin/sh\necho pwned\n') })).status, 415);
    assert.equal((await t.call('POST', '/panel-assets/logo', { body: await solid(8, 8).png().toBuffer(), type: 'image/png' })).status, 415);
    assert.equal((await t.call('POST', '/panel-assets/../etc', { body: Buffer.from('x') })).status, 404);
    assert.equal((await t.call('POST', '/panel-assets/favicon', { body: await solid(8, 8).png().toBuffer() })).status, 404);

    const tooBig = Buffer.concat([await solid(8, 8).png().toBuffer(), Buffer.alloc(1024 * 1024 + 1)]);
    const res = await t.call('POST', '/panel-assets/logo', { body: tooBig });
    assert.equal(res.status, 413);
    assert.match((await res.json()).error, /1 MB/);

    assert.deepEqual(fs.readdirSync(t.assetsDir).filter(n => n !== 'default'), []);
    assert.equal(fs.readFileSync(t.configFile, 'utf-8'), ROUTE_CONFIG);
    assert.deepEqual(t.audits, []);
  } finally {
    t.server.close();
  }
});

test('upload and reset need config.edit; viewing needs config.view', async () => {
  const t = await startApp();
  try {
    const png = await solid(8, 8).png().toBuffer();
    assert.equal((await t.call('POST', '/panel-assets/logo', { body: png, perms: 'config.view' })).status, 403);
    assert.equal((await t.call('POST', '/panel-assets/logo', { body: png, perms: 'tickets.view,settings.edit' })).status, 403);
    assert.equal((await t.call('DELETE', '/panel-assets/logo', { perms: 'config.view' })).status, 403);
    assert.equal((await t.call('GET', '/panel-assets', { perms: 'tickets.view' })).status, 403);
    assert.equal((await t.call('GET', '/panel-assets/logo/preview', { perms: '' })).status, 403);

    const state = await (await t.call('GET', '/panel-assets', { perms: 'config.view' })).json();
    assert.equal(state.slots.logo.file, 'logo.png');
    assert.equal(state.slots.logo.exists, true);
    assert.equal(state.slots.banner.exists, false);
    assert.equal(state.scanned, false);
    assert.deepEqual(t.audits, []);
    assert.equal(fs.readFileSync(t.configFile, 'utf-8'), ROUTE_CONFIG);
  } finally {
    t.server.close();
  }
});

test('upload: a file the scanner flags is refused and audited', async () => {
  const scanned = [];
  const t = await startApp({ scan: async (buf) => { scanned.push(buf); return { clean: false, signature: 'Eicar-Test-Signature' }; } });
  try {
    const png = await solid(8, 8).png().toBuffer();
    const res = await t.call('POST', '/panel-assets/logo', { body: png });
    assert.equal(res.status, 422);
    assert.match((await res.json()).error, /Eicar-Test-Signature/);
    assert.ok(scanned[0].equals(png), 'the raw upload is what gets scanned');
    assert.deepEqual(t.audits.map(a => [a.action, a.target, a.detail.signature]), [['panel.asset.infected', 'logo', 'Eicar-Test-Signature']]);
    assert.deepEqual(fs.readdirSync(t.assetsDir).filter(n => n !== 'default'), []);
    assert.equal(fs.readFileSync(t.configFile, 'utf-8'), ROUTE_CONFIG);
  } finally {
    t.server.close();
  }
});

test('upload: a configured scanner that is down refuses the upload (fail closed)', async () => {
  const t = await startApp({ scan: async () => { throw new ClamavUnavailableError('ClamAV is not reachable (ECONNREFUSED).'); } });
  try {
    const res = await t.call('POST', '/panel-assets/logo', { body: await solid(8, 8).png().toBuffer() });
    assert.equal(res.status, 503);
    assert.deepEqual(fs.readdirSync(t.assetsDir).filter(n => n !== 'default'), []);
    assert.equal(fs.readFileSync(t.configFile, 'utf-8'), ROUTE_CONFIG);
  } finally {
    t.server.close();
  }
});

test('upload: the real clamd client is used when CLAMAV_HOST is set, and it fails closed', async () => {
  const probe = net.createServer();
  await new Promise(r => probe.listen(0, '127.0.0.1', r));
  const deadPort = probe.address().port;
  await new Promise(r => probe.close(r));

  const t = await startApp({ env: { CLAMAV_HOST: '127.0.0.1', CLAMAV_PORT: String(deadPort) } });
  try {
    const res = await t.call('POST', '/panel-assets/logo', { body: await solid(8, 8).png().toBuffer() });
    assert.equal(res.status, 503);
    assert.equal((await (await t.call('GET', '/panel-assets')).json()).scanned, true);
  } finally {
    t.server.close();
  }
});

test('preview never serves an SVG, even if the config names one', async () => {
  const t = await startApp();
  try {
    fs.writeFileSync(path.join(t.assetsDir, 'evil.svg'), SVG_OK);
    fs.writeFileSync(t.configFile, ROUTE_CONFIG.replace('"logo.png"', '"evil.svg"'));
    assert.equal((await t.call('GET', '/panel-assets/logo/preview')).status, 415);

    fs.writeFileSync(t.configFile, ROUTE_CONFIG.replace('"logo.png"', '"../config.jsonc"'));
    assert.equal((await t.call('GET', '/panel-assets/logo/preview')).status, 404);
  } finally {
    t.server.close();
  }
});

test('upload: a config the bot could not boot with is not touched, and no file is left behind', async () => {
  // CONFIG_TEXT lacks required keys (ticketTypes, …): a fatal error for the bot.
  const t = await startApp({ config: CONFIG_TEXT });
  try {
    const res = await t.call('POST', '/panel-assets/logo', { body: await solid(8, 8).png().toBuffer() });
    assert.equal(res.status, 409);
    assert.equal(fs.readFileSync(t.configFile, 'utf-8'), CONFIG_TEXT);
    assert.deepEqual(fs.readdirSync(t.assetsDir).filter(n => n !== 'default'), []);
    assert.deepEqual(t.audits, []);
  } finally {
    t.server.close();
  }
});
