const test   = require('node:test');
const assert = require('node:assert');

const { resolveAttachmentBudget } = require('../src/utils/ticketActions');

const MB = 1024 * 1024;
const FALLBACK = 100 * MB;

// The bot used to cap attachments at a fixed 100 MB because it did not know its
// tier. That was wrong in both directions: a Business guild (500 MB) could never
// use what it paid for, and a Basic guild (0 MB) uploaded attachments its tier
// forbids, which made the server reject the whole transcript with 413.

test('follows the tier cap the server reported', () => {
  assert.strictEqual(
    resolveAttachmentBudget({ tierLimits: { attachments: true, attachmentMaxBytes: 500 * MB } }),
    500 * MB,
  );
  assert.strictEqual(
    resolveAttachmentBudget({ tierLimits: { attachments: true, attachmentMaxBytes: 100 * MB } }),
    100 * MB,
  );
});

test('returns 0 when the tier allows no attachments', () => {
  assert.strictEqual(
    resolveAttachmentBudget({ tierLimits: { attachments: false, attachmentMaxBytes: 0 } }),
    0,
  );
});

test('falls back when the tier is unknown', () => {
  // No API key, server unreachable at startup, or a server too old to report limits.
  assert.strictEqual(resolveAttachmentBudget({ tierLimits: null }), FALLBACK);
  assert.strictEqual(resolveAttachmentBudget({}), FALLBACK);
  assert.strictEqual(resolveAttachmentBudget(undefined), FALLBACK);
});

test('falls back on an unusable cap instead of trusting it', () => {
  for (const cap of [undefined, null, 'lots', NaN, Infinity, -1]) {
    assert.strictEqual(
      resolveAttachmentBudget({ tierLimits: { attachments: true, attachmentMaxBytes: cap } }),
      FALLBACK,
      `cap ${String(cap)} should fall back`,
    );
  }
});

test('a zero cap without the attachments flag still means zero', () => {
  // Belt and braces: the flag and the number should agree, but if only the
  // number says zero, uploading anything would still earn a 413.
  assert.strictEqual(
    resolveAttachmentBudget({ tierLimits: { attachmentMaxBytes: 0 } }),
    0,
  );
});
