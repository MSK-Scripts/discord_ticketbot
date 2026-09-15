/**
 * Dashboard rate limits, built on express-rate-limit.
 *
 * Four tiers, each its own limiter with its own in-memory store:
 *
 *   global  per IP, every request
 *   auth    per IP, the OAuth login + callback (shared budget, far stricter:
 *           that is where an attacker would grind, a real user hits it twice)
 *   write   per user, state-changing API calls, so a browser client cannot
 *           spend the bot's global Discord rate-limit quota
 *   health  per IP, /api/health, counting FAILED secret attempts only
 *
 * In-memory is exactly right here: the dashboard is a single Node process. A
 * restart only ever resets limits, it never grants extra access.
 *
 * Keys use req.clientIp (rightmost X-Forwarded-For, see security.getClientIp)
 * passed through ipKeyGenerator, so an IPv6 client cannot dodge a limit by
 * rotating through its /56.
 */

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const DEFAULT_LIMITS = {
  global: { limit: 240, windowMs: 60_000 },
  auth:   { limit: 10,  windowMs: 5 * 60_000 },
  write:  { limit: 30,  windowMs: 60_000 },
  health: { limit: 10,  windowMs: 5 * 60_000 },
};

const byClientIp = (req) => ipKeyGenerator(req.clientIp);

function retryAfterSeconds(req) {
  const reset = req.rateLimit?.resetTime;
  return reset ? Math.max(0, Math.ceil((reset.getTime() - Date.now()) / 1000)) : 0;
}

function build({ limit, windowMs }, { keyGenerator, respond, skip, skipSuccessfulRequests }) {
  const options = {
    limit,
    windowMs,
    keyGenerator,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req, res) => {
      res.set('Retry-After', String(retryAfterSeconds(req)));
      respond(res);
    },
  };
  if (skip) options.skip = skip;
  if (skipSuccessfulRequests) options.skipSuccessfulRequests = true;
  return rateLimit(options);
}

/**
 * @param {Partial<typeof DEFAULT_LIMITS>} [overrides] — per-tier limit/windowMs, for tests
 */
function createLimiters(overrides = {}) {
  const tier = (name) => ({ ...DEFAULT_LIMITS[name], ...overrides[name] });

  return {
    global: build(tier('global'), {
      keyGenerator: byClientIp,
      respond: (res) => res.status(429).json({ error: 'Too many requests. Please slow down.' }),
    }),

    auth: build(tier('auth'), {
      keyGenerator: byClientIp,
      respond: (res) => res.status(429).send('Too many login attempts. Please try again later.'),
    }),

    // Mounted after requireAuth, so req.auth is always set when it counts.
    write: build(tier('write'), {
      keyGenerator: (req) => `user:${req.auth.userId}`,
      skip: (req) => req.method === 'GET' || req.method === 'HEAD',
      respond: (res) => res.status(429).json({ error: 'Too many changes. Please slow down.' }),
    }),

    // Only failures are charged. msk-shop polls this from localhost, so every
    // hosted probe shares one client IP; counting successful calls could
    // throttle a provisioning check, and a 429 would push msk-shop back onto the
    // permission-gated fallback the probe exists to avoid.
    health: build(tier('health'), {
      keyGenerator: byClientIp,
      skipSuccessfulRequests: true,
      respond: (res) => res.status(429).json({ error: 'Too many failed attempts.' }),
    }),
  };
}

module.exports = { createLimiters, DEFAULT_LIMITS };
