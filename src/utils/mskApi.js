/**
 * MSK API Client
 * Handles all communication between the bot and msk-scripts.de.
 * The server is the single source of truth – the bot only sends data.
 */

const MSK_API_URL = process.env.MSK_API_URL ?? 'https://www.msk-scripts.de';
const MSK_API_KEY = process.env.MSK_API_KEY ?? '';

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

  let response;
  try {
    response = await fetch(`${MSK_API_URL}/api/transcript/upload`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MSK_API_KEY}`,
      },
      body: JSON.stringify({
        ticketId,
        transcriptHtml,
        attachments: serializedAttachments,
      }),
    });
  } catch (err) {
    return { success: false, url: null, error: `Network error: ${err.message}` };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { success: false, url: null, error: `Invalid response from server (HTTP ${response.status}).` };
  }

  if (!response.ok) {
    return { success: false, url: null, error: data?.error ?? `Server error (HTTP ${response.status}).` };
  }

  return { success: true, url: data.url, tier: data.tier, expiresAt: data.expiresAt, error: null };
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
 * @returns {Promise<{ status: 'not_configured'|'invalid'|'valid', tier: string|null }>}
 */
async function checkApiKey() {
  if (!MSK_API_KEY || MSK_API_KEY === 'YOUR_MSK_API_KEY_HERE') {
    return { status: 'not_configured', tier: null };
  }

  let response;
  try {
    response = await fetch(`${MSK_API_URL}/api/verify/status`, {
      method:  'GET',
      headers: { 'Authorization': `Bearer ${MSK_API_KEY}` },
    });
  } catch {
    return { status: 'unreachable', tier: null };
  }

  if (response.status === 401 || response.status === 403) {
    return { status: 'invalid', tier: null };
  }

  try {
    const data = await response.json();
    return { status: 'valid', tier: data.tier };
  } catch {
    return { status: 'invalid', tier: null };
  }
}

module.exports = { uploadTranscript, checkApiKey, getTranscriptUrl };
