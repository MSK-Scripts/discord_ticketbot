/**
 * Minimal clamd client: the zINSTREAM command over a UNIX or TCP socket.
 *
 * Written against node's net module instead of a package, because the protocol
 * is four lines long:
 *
 *   send   "zINSTREAM\0"
 *   send   <uint32 big-endian length><chunk>   (repeated)
 *   send   <uint32 0>                          (end of stream)
 *   read   "stream: OK\0" | "stream: <signature> FOUND\0" | "<message> ERROR\0"
 *
 * Every failure that is not a clean answer (refused connection, timeout, an
 * ERROR reply such as "INSTREAM size limit exceeded", a reply we do not
 * understand) rejects with ClamavUnavailableError. The caller treats that as
 * "not scanned" and refuses the upload: a configured scanner fails closed.
 */

const net = require('net');

const CHUNK_SIZE = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;

class ClamavUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClamavUnavailableError';
  }
}

/**
 * Scanner settings from the environment. CLAMAV_SOCKET wins over
 * CLAMAV_HOST/CLAMAV_PORT. Returns null when neither is set (scanning off).
 * An unusable value is returned as { invalid } so the scanner fails closed
 * instead of silently not scanning.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {null|{socketPath: string}|{host: string, port: number}|{invalid: string}}
 */
function clamavConfigFromEnv(env = process.env) {
  const socketPath = String(env.CLAMAV_SOCKET ?? '').trim();
  if (socketPath) return { socketPath };

  const host = String(env.CLAMAV_HOST ?? '').trim();
  if (!host) return null;

  const rawPort = String(env.CLAMAV_PORT ?? '').trim();
  const port = rawPort === '' ? 3310 : Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { invalid: `CLAMAV_PORT "${rawPort}" is not a valid port.` };
  }
  return { host, port };
}

/** Human-readable target for log lines. */
function describeTarget(cfg) {
  if (!cfg) return 'not configured';
  if (cfg.invalid) return `invalid (${cfg.invalid})`;
  return cfg.socketPath ? `socket ${cfg.socketPath}` : `${cfg.host}:${cfg.port}`;
}

/**
 * Send one clamd command, optionally followed by a body, and resolve with the
 * NUL-terminated reply as a trimmed string.
 */
function clamdRequest(cfg, command, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!cfg || cfg.invalid) {
      reject(new ClamavUnavailableError(cfg?.invalid ?? 'ClamAV is not configured.'));
      return;
    }

    const socket = cfg.socketPath
      ? net.createConnection({ path: cfg.socketPath })
      : net.createConnection({ host: cfg.host, port: cfg.port });

    const chunks = [];
    let settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (err) reject(err); else resolve(value);
    };
    const reply = () => Buffer.concat(chunks).toString('utf-8').replace(/\0+$/, '').trim();

    const timer = setTimeout(
      () => finish(new ClamavUnavailableError(`ClamAV did not answer within ${Math.round(timeoutMs / 1000)}s.`)),
      timeoutMs,
    );

    socket.on('data', (data) => {
      chunks.push(data);
      if (data.includes(0)) finish(null, reply());
    });
    socket.on('end', () => {
      if (chunks.length) finish(null, reply());
      else finish(new ClamavUnavailableError('ClamAV closed the connection without an answer.'));
    });
    // clamd may close the socket while we are still writing (for example once
    // StreamMaxLength is exceeded). Whatever it answered before that wins.
    socket.on('error', (err) => {
      if (chunks.length) finish(null, reply());
      else finish(new ClamavUnavailableError(`ClamAV is not reachable (${err.code || err.message}).`));
    });

    socket.on('connect', () => {
      socket.write(`z${command}\0`);
      if (body) {
        for (let offset = 0; offset < body.length; offset += CHUNK_SIZE) {
          const chunk = body.subarray(offset, offset + CHUNK_SIZE);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length, 0);
          socket.write(size);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4)); // zero-length chunk ends the stream
      }
    });
  });
}

/**
 * Scan a buffer with clamd.
 * @param {Buffer} buf
 * @param {object} cfg from clamavConfigFromEnv
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<{clean: true}|{clean: false, signature: string}>}
 * @throws {ClamavUnavailableError} on every outcome that is not a verdict
 */
async function scanBuffer(buf, cfg, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const answer = await clamdRequest(cfg, 'INSTREAM', buf, timeoutMs);
  if (/^stream:\s*OK$/i.test(answer)) return { clean: true };
  const found = answer.match(/^stream:\s*(.+?)\s+FOUND$/i);
  if (found) return { clean: false, signature: found[1] };
  throw new ClamavUnavailableError(`ClamAV could not scan the file (${answer.slice(0, 200) || 'empty reply'}).`);
}

/** Resolves true when clamd answers PING with PONG, false otherwise. Never throws. */
async function pingClamd(cfg, { timeoutMs = 5_000 } = {}) {
  try {
    return (await clamdRequest(cfg, 'PING', null, timeoutMs)) === 'PONG';
  } catch {
    return false;
  }
}

module.exports = {
  ClamavUnavailableError,
  clamavConfigFromEnv,
  describeTarget,
  scanBuffer,
  pingClamd,
};
