/**
 * MSK API Client
 * Handles all communication between the bot and msk-scripts.de.
 * The server is the single source of truth – the bot only sends data.
 */

const MSK_API_URL = process.env.MSK_API_URL ?? 'https://www.msk-scripts.de';
const MSK_API_KEY = process.env.MSK_API_KEY ?? '';

// Transient upload failures worth retrying: a network-level error, or a status
// that means the reverse proxy is up but the backend was momentarily
// unreachable/overloaded (Bad Gateway / Service Unavailable / Gateway Timeout).
// Everything else — 4xx (bad key, size, validation) and a genuine app 500
// (e.g. a filesystem EACCES) — is returned immediately, since a retry can't fix it.
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const UPLOAD_MAX_ATTEMPTS = 3;
// Backoff between attempts (ms). One entry per gap → MAX_ATTEMPTS - 1 entries.
const UPLOAD_RETRY_DELAYS_MS = [1000, 3000];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload a transcript HTML to the MSK server.
 * The server determines the guild tier from the API key – not from this request.
 *
 * @param {object} opts
 * @param {number}  opts.ticketId       – ticket DB id
 * @param {string}  opts.transcriptHtml – full HTML string
 * @param {Array}   opts.attachments    – optional array of { name, data (Buffer), mimeType }
 * @returns {Promise<{ success: boolean, url: string|null, error: string|null }>}
 */
async function uploadTranscript({ ticketId, transcriptHtml, attachments = [] }) {
  if (!MSK_API_KEY) {
    return { success: false, url: null, error: 'MSK_API_KEY is not configured.' };
  }

  // Convert Buffer attachments to base64. `id` (when present) is the stable UUID
  // the transcript HTML already references as attachments/<id>.<ext>; the server
  // stores the file under exactly that name so the relative link resolves.
  const serializedAttachments = attachments.map(att => ({
    ...(att.id ? { id: att.id } : {}),
    name:     att.name,
    mimeType: att.mimeType,
    data:     Buffer.isBuffer(att.data)
      ? att.data.toString('base64')
      : att.data,
  }));

  const body = JSON.stringify({
    ticketId,
    transcriptHtml,
    attachments: serializedAttachments,
  });

  // Retry transient failures (network error / 502·503·504) with a short backoff
  // before giving up, so a brief backend blip during a deploy or load spike
  // doesn't force the caller straight to the file fallback. Permanent failures
  // return on the first attempt.
  let last = { success: false, url: null, error: 'Upload not attempted.' };
  for (let attempt = 0; attempt < UPLOAD_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(UPLOAD_RETRY_DELAYS_MS[attempt - 1]);

    const outcome = await attemptUpload(body);
    last = outcome.result;
    if (!outcome.retryable) return outcome.result;
  }
  return last;
}

/**
 * A single upload attempt.
 * @param {string} body  serialized JSON request body
 * @returns {Promise<{ retryable: boolean, result: { success: boolean, url: string|null, error: string|null } }>}
 */
async function attemptUpload(body) {
  let response;
  try {
    response = await fetch(`${MSK_API_URL}/api/transcript/upload`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MSK_API_KEY}`,
      },
      body,
    });
  } catch (err) {
    // Network-level failure (DNS, connection reset, timeout) — transient.
    return { retryable: true, result: { success: false, url: null, error: `Network error: ${err.message}` } };
  }

  // Proxy up, backend momentarily unavailable — retry.
  if (RETRYABLE_STATUS.has(response.status)) {
    return { retryable: true, result: { success: false, url: null, error: `Server error (HTTP ${response.status}).` } };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { retryable: false, result: { success: false, url: null, error: `Invalid response from server (HTTP ${response.status}).` } };
  }

  if (!response.ok) {
    return { retryable: false, result: { success: false, url: null, error: data?.error ?? `Server error (HTTP ${response.status}).` } };
  }

  return { retryable: false, result: { success: true, url: data.url, tier: data.tier, expiresAt: data.expiresAt, error: null } };
}

/**
 * Fetch the hosted transcript URL for a ticket from the MSK server.
 *
 * The dashboard uses this to offer an "Open transcript" link for closed tickets.
 * The server derives the guild from the API key and returns the URL it already
 * stored at upload time — so the bot never has to persist the URL itself, and it
 * works for tickets that were closed before this feature existed.
 *
 * @param {number|string} ticketId
 * @returns {Promise<string|null>} the public URL, or null if none / not premium
 */
async function getTranscriptUrl(ticketId) {
  const apiKey = process.env.MSK_API_KEY ?? '';
  if (!apiKey) return null;

  try {
    const response = await fetch(`${MSK_API_URL}/api/transcript/url?ticketId=${encodeURIComponent(ticketId)}`, {
      method:  'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Check the validity and tier of the configured API key.
 * Called once at bot startup to inform the user of their premium status.
 *
 * Returns the tier's limits alongside the tier. The server owns those numbers
 * (lib/tiers.ts over there); the bot must not keep a second copy, or it will
 * eventually enforce limits its own service no longer uses. `limits` is null
 * whenever the tier is unknown, and every caller has to handle that.
 *
 * @returns {Promise<{ status: 'not_configured'|'invalid'|'unreachable'|'valid', tier: string|null, limits: object|null }>}
 */
async function checkApiKey() {
  if (!MSK_API_KEY || MSK_API_KEY === 'YOUR_MSK_API_KEY_HERE') {
    return { status: 'not_configured', tier: null, limits: null };
  }

  let response;
  try {
    response = await fetch(`${MSK_API_URL}/api/verify/status`, {
      method:  'GET',
      headers: { 'Authorization': `Bearer ${MSK_API_KEY}` },
    });
  } catch {
    return { status: 'unreachable', tier: null, limits: null };
  }

  if (response.status === 401 || response.status === 403) {
    return { status: 'invalid', tier: null, limits: null };
  }

  try {
    const data = await response.json();
    // `limits` is absent when talking to an older server. Null, not a guessed
    // default, so the caller falls back deliberately instead of silently
    // running on numbers nobody chose.
    return { status: 'valid', tier: data.tier, limits: data.limits ?? null };
  } catch {
    return { status: 'invalid', tier: null, limits: null };
  }
}

module.exports = { uploadTranscript, checkApiKey, getTranscriptUrl };
