/**
 * Staff comments on a posted rating.
 *
 * The interesting part is not the happy path but the two guards: a message that
 * only LOOKS like a rating (wrong channel, wrong author) must be rejected, and the
 * permission check must not silently pass when `commentRoles` is empty — it falls
 * back to the normal staff check, which is a decision, not an accident.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isRatingMessage, canCommentFeedback, commentFieldName, existingComment, upsertComment,
  MAX_EMBED_FIELDS,
} = require('../src/utils/feedbackComments');

const RATINGS = '111111111111111111';
const BOT     = '222222222222222222';
const ROLE    = '333333333333333333';

const client = (over = {}) => ({
  user: { id: BOT },
  config: { ratingSystem: { ratingsChannelId: RATINGS }, ...over.config },
  isStaff: over.isStaff ?? (() => false),
  t: (key, vars = {}) => key.replace('ratings.staffCommentField', `C ${vars.user}`),
});

const msg = (over = {}) => ({
  channelId: RATINGS,
  author: { id: BOT },
  embeds: [{ title: 'x' }],
  ...over,
});

const member = (roleIds = [], admin = false) => ({
  displayName: 'Mo',
  permissions: { has: () => admin },
  roles: { cache: { has: id => roleIds.includes(id) } },
});

// ── isRatingMessage ──────────────────────────────────────────────────────────

test('a bot message with an embed in the ratings channel is a rating post', () => {
  assert.equal(isRatingMessage(client(), msg()), true);
});

test('a message from another channel is not a rating post', () => {
  assert.equal(isRatingMessage(client(), msg({ channelId: '999' })), false);
});

test('a message from another author is not a rating post, even in the right channel', () => {
  assert.equal(isRatingMessage(client(), msg({ author: { id: '999' } })), false);
});

test('a bot message without an embed is not a rating post', () => {
  assert.equal(isRatingMessage(client(), msg({ embeds: [] })), false);
});

test('without a configured ratings channel nothing qualifies', () => {
  assert.equal(isRatingMessage(client({ config: { ratingSystem: {} } }), msg()), false);
});

// ── canCommentFeedback ───────────────────────────────────────────────────────

test('a configured comment role may comment', () => {
  const c = client({ config: { ratingSystem: { ratingsChannelId: RATINGS, commentRoles: [ROLE] } } });
  assert.equal(canCommentFeedback(c, member([ROLE])), true);
});

test('without that role, a configured list denies — the staff fallback must not leak in', () => {
  const c = client({
    config: { ratingSystem: { ratingsChannelId: RATINGS, commentRoles: [ROLE] } },
    isStaff: () => true,
  });
  assert.equal(canCommentFeedback(c, member([])), false);
});

test('an empty list falls back to the normal staff check', () => {
  assert.equal(canCommentFeedback(client({ isStaff: () => true }), member([])), true);
  assert.equal(canCommentFeedback(client({ isStaff: () => false }), member([])), false);
});

test('an administrator may comment regardless of the list', () => {
  const c = client({ config: { ratingSystem: { ratingsChannelId: RATINGS, commentRoles: [ROLE] } } });
  assert.equal(canCommentFeedback(c, member([], true)), true);
});

test('no member (outside a guild) may not comment', () => {
  assert.equal(canCommentFeedback(client(), null), false);
});

// ── upsertComment ────────────────────────────────────────────────────────────

test('a first comment is appended, a second one from the same person replaces it', () => {
  const name = commentFieldName(client(), member());
  const embed = { fields: [{ name: 'Rating', value: '5', inline: true }] };

  let fields = upsertComment(embed, name, 'thanks');
  assert.equal(fields.length, 2);
  assert.equal(fields[1].value, 'thanks');

  fields = upsertComment({ fields }, name, 'thanks again');
  assert.equal(fields.length, 2, 'must replace, not stack up');
  assert.equal(fields[1].value, 'thanks again');
});

test('two different people get their own field', () => {
  const c = client();
  const a = commentFieldName(c, { displayName: 'Ann', permissions: { has: () => false }, roles: { cache: { has: () => false } } });
  const b = commentFieldName(c, { displayName: 'Ben', permissions: { has: () => false }, roles: { cache: { has: () => false } } });
  const fields = upsertComment({ fields: upsertComment({ fields: [] }, a, 'x') }, b, 'y');
  assert.equal(fields.length, 2);
});

test('the comment is cut to the embed field limit instead of throwing', () => {
  const fields = upsertComment({ fields: [] }, 'n', 'a'.repeat(2000));
  assert.equal(fields[0].value.length, 1024);
});

test('a full embed returns null so the caller can report it', () => {
  const full = { fields: Array.from({ length: MAX_EMBED_FIELDS }, (_, i) => ({ name: `f${i}`, value: 'v' })) };
  assert.equal(upsertComment(full, 'new', 'x'), null);
});

test('an existing comment is found for prefilling the modal', () => {
  assert.equal(existingComment({ fields: [{ name: 'n', value: 'old' }] }, 'n'), 'old');
  assert.equal(existingComment({ fields: [] }, 'n'), '');
  assert.equal(existingComment(undefined, 'n'), '');
});
