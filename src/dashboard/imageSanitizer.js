/**
 * Panel image intake: type detection and sanitising re-encode.
 *
 * Everything here works on the uploaded BYTES. The client's file name and MIME
 * type never reach a decision: the type comes from the magic bytes (or, for SVG,
 * from a strict text check), and the stored file is a fresh encode of the
 * decoded pixels. Re-encoding is what strips EXIF, GPS, ICC comments, XMP and
 * anything appended after the image data (polyglot payloads), because none of
 * it survives the trip through a pixel buffer.
 *
 * sharp is required lazily: only the dashboard process needs it, and a platform
 * without a prebuilt binary should lose the upload feature, not the dashboard.
 */

// Decompression-bomb guard: the decoder refuses anything larger than this many
// pixels before it allocates the pixel buffer. 30 MP covers a 24 MP camera photo
// and short animated GIFs (sharp counts every frame), and caps the RGBA buffer
// at roughly 120 MB.
const MAX_INPUT_PIXELS = 30_000_000;

// Discord rejects attachments above 10 MiB, and the panel posts the image as an
// attachment. A re-encode (an animated GIF in particular) can grow, so the
// result is checked as well.
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

// A slow decode must not hold the single upload slot forever.
const PROCESS_TIMEOUT_SECONDS = 20;

// An SVG icon with a 24px viewBox would otherwise be rasterised at 24px. It is
// rendered at a higher density instead (vector, so no upscaling of pixels), up
// to this factor.
const MAX_SVG_SCALE = 16;

const ALLOWED_TYPES = ['png', 'jpeg', 'gif', 'webp', 'svg'];

class ImageRejectedError extends Error {
  /** @param {number} status HTTP status the route should answer with */
  constructor(status, message) {
    super(message);
    this.name = 'ImageRejectedError';
    this.status = status;
  }
}

const startsWith = (buf, bytes, offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

const ascii = (s) => [...s].map(c => c.charCodeAt(0));

/**
 * The image type, taken from the content. Raster formats by magic bytes; SVG by
 * a text check (UTF-8, optional XML prolog, then an <svg> root element).
 * @param {Buffer} buf
 * @returns {'png'|'jpeg'|'gif'|'webp'|'svg'|null}
 */
function detectImageType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return null;
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(buf, ascii('GIF87a')) || startsWith(buf, ascii('GIF89a'))) return 'gif';
  if (startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WEBP'), 8)) return 'webp';
  if (decodeSvgText(buf) !== null) return 'svg';
  return null;
}

/**
 * The SVG document as text, or null when the bytes are not an SVG document:
 * strict UTF-8, no NUL bytes, and after an optional BOM, XML declaration,
 * comments and a DOCTYPE the first element is <svg>.
 * @param {Buffer} buf
 * @returns {string|null}
 */
function decodeSvgText(buf) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return null;
  }
  if (text.includes('\0')) return null;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let rest = text;
  for (;;) {
    rest = rest.replace(/^\s+/, '');
    const m = rest.match(/^<\?xml[\s\S]*?\?>/) || rest.match(/^<!--[\s\S]*?-->/) || rest.match(/^<!DOCTYPE[^>]*>/i);
    if (!m) break;
    rest = rest.slice(m[0].length);
  }
  return /^<svg[\s>/]/.test(rest) && /<\/svg\s*>\s*$|\/>\s*$/.test(text.trim()) ? text : null;
}

// Rules an SVG must pass before it is handed to the renderer. Deliberately a
// deny-by-default on anything that can reach outside the document: there is no
// legitimate need for scripts, external references or entities in a logo.
const SVG_RULES = [
  [/<!ENTITY/i, 'entity declarations'],
  [/<!DOCTYPE[^>]*\[/i, 'an internal DTD'],
  [/<\?xml-stylesheet/i, 'an external stylesheet'],
  [/<\s*script/i, 'a script'],
  [/<\s*foreignObject/i, 'embedded HTML (foreignObject)'],
  [/<\s*(?:iframe|embed|object|audio|video|canvas)\b/i, 'embedded content'],
  [/<\s*[a-z0-9_-]*:?include\b/i, 'an XInclude'],
  [/\son[a-z]+\s*=/i, 'an event handler attribute'],
  [/javascript\s*:/i, 'a javascript: URL'],
  [/@import/i, 'a CSS import'],
  [/url\(\s*(?![\s'"]*#)/i, 'a CSS url() that is not a local reference'],
];

/**
 * Strict safety check of an SVG document. Only local references (href="#id")
 * are allowed; any external href/src, including data: URIs, is refused so the
 * renderer never loads anything but the document itself.
 * @param {Buffer} buf
 * @returns {{ok: true}|{ok: false, reason: string}}
 */
function checkSvgSafety(buf) {
  const text = decodeSvgText(buf);
  if (text === null) return { ok: false, reason: 'The file is not a valid SVG document.' };

  for (const [re, what] of SVG_RULES) {
    if (re.test(text)) return { ok: false, reason: `SVG files with ${what} are not allowed. Export the logo as PNG instead.` };
  }
  const refRe = /\b(?:xlink:)?(?:href|src)\s*=\s*(["'])([\s\S]*?)\1/gi;
  for (const m of text.matchAll(refRe)) {
    if (!m[2].trim().startsWith('#')) {
      return { ok: false, reason: 'SVG files that reference other files or URLs are not allowed. Export the logo as PNG instead.' };
    }
  }
  return { ok: true };
}

let sharpModule;
function loadSharp() {
  if (sharpModule === undefined) {
    try {
      sharpModule = require('sharp');
      // No libvips operation cache: the dashboard processes a few uploads a day,
      // keeping decoded images around only costs memory.
      sharpModule.cache(false);
    } catch {
      sharpModule = null;
    }
  }
  if (!sharpModule) {
    throw new ImageRejectedError(503, 'Image processing is not available on this installation (the sharp module could not be loaded). Run npm install and restart the dashboard.');
  }
  return sharpModule;
}

/**
 * Decode the image and encode it fresh. Nothing of the input but its pixels
 * reaches the output.
 *
 *   png, svg, static gif → PNG
 *   jpeg                 → JPEG (photos stay small)
 *   webp                 → WebP (animation kept)
 *   animated gif         → GIF (animation kept)
 *
 * SVG is always rasterised: Discord does not render SVG in embeds, and an SVG
 * file can carry script.
 *
 * @param {Buffer} input raw upload
 * @param {'png'|'jpeg'|'gif'|'webp'|'svg'} type from detectImageType
 * @param {{maxWidth: number, maxHeight: number}} bounds
 * @returns {Promise<{buffer: Buffer, ext: string, mime: string, format: string, width: number, height: number, animated: boolean}>}
 */
async function sanitizeImage(input, type, { maxWidth, maxHeight }) {
  if (!ALLOWED_TYPES.includes(type)) throw new ImageRejectedError(415, 'Unsupported image type.');
  const sharp = loadSharp();

  // failOn 'error' rejects corrupt and truncated input; 'warning' would also
  // refuse many real camera JPEGs over harmless libjpeg warnings.
  const base = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' };
  const animatable = type === 'gif' || type === 'webp';
  const opts = animatable ? { ...base, animated: true } : { ...base };

  let meta;
  try {
    meta = await sharp(input, opts).metadata();
  } catch (err) {
    throw mapSharpError(err);
  }
  if (!meta.width || !meta.height) throw new ImageRejectedError(422, 'The image has no readable dimensions.');

  if (type === 'svg') {
    const scale = Math.min(maxWidth / meta.width, maxHeight / meta.height, MAX_SVG_SCALE);
    if (scale > 1) opts.density = Math.round(72 * scale);
  }

  const animated = animatable && (meta.pages ?? 1) > 1;
  let pipeline = sharp(input, opts);
  if (!animated) pipeline = pipeline.autoOrient(); // apply EXIF rotation before it is dropped
  pipeline = pipeline
    .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
    .timeout({ seconds: PROCESS_TIMEOUT_SECONDS });

  let format;
  if (type === 'jpeg') {
    format = 'jpeg';
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  } else if (type === 'webp') {
    format = 'webp';
    pipeline = pipeline.webp({ quality: 90 });
  } else if (animated) {
    format = 'gif';
    pipeline = pipeline.gif();
  } else {
    format = 'png';
    pipeline = pipeline.png({ compressionLevel: 9 });
  }

  let result;
  try {
    result = await pipeline.toBuffer({ resolveWithObject: true });
  } catch (err) {
    throw mapSharpError(err);
  }
  if (result.info.format !== format) throw new ImageRejectedError(500, 'The image could not be converted.');
  if (result.data.length > MAX_OUTPUT_BYTES) {
    throw new ImageRejectedError(413, 'The processed image is larger than the 10 MB Discord allows for an attachment. Use a smaller image.');
  }

  const out = { jpeg: ['jpg', 'image/jpeg'], webp: ['webp', 'image/webp'], gif: ['gif', 'image/gif'], png: ['png', 'image/png'] }[format];
  return {
    buffer: result.data,
    ext: out[0],
    mime: out[1],
    format,
    width: result.info.width,
    height: result.info.pageHeight ?? result.info.height,
    animated,
  };
}

function mapSharpError(err) {
  if (err instanceof ImageRejectedError) return err;
  const msg = String(err?.message ?? '');
  if (/pixel limit/i.test(msg)) {
    return new ImageRejectedError(413, 'The image dimensions are too large. Use an image with fewer pixels.');
  }
  if (/timeout/i.test(msg)) {
    return new ImageRejectedError(422, 'The image took too long to process.');
  }
  return new ImageRejectedError(422, 'The image could not be read. It may be corrupt or not a real image.');
}

module.exports = {
  ALLOWED_TYPES,
  MAX_INPUT_PIXELS,
  MAX_OUTPUT_BYTES,
  ImageRejectedError,
  detectImageType,
  checkSvgSafety,
  sanitizeImage,
};
