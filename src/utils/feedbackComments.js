/**
 * Shared logic for staff comments on a posted rating.
 *
 * Both the message context menu (`src/commands/feedbackComment.js`) and the modal
 * that follows it (`src/components/modals/feedbackComment.js`) need the same three
 * answers: is this message a rating post, may this member comment on it, and where
 * does the comment go inside the embed. Keeping them here means the modal submit
 * re-checks the permission instead of trusting that the context menu already did —
 * roles can change between opening the modal and submitting it.
 */

const MAX_EMBED_FIELDS  = 25;
const MAX_FIELD_VALUE   = 1024;

/**
 * A message qualifies as a rating post when the bot itself posted it into the
 * configured ratings channel and it carries an embed. Parsing the (translated)
 * title would break for every server that is not on English.
 * @returns {boolean}
 */
function isRatingMessage(client, message) {
  const ratingsChannelId = client.config.ratingSystem?.ratingsChannelId;
  if (!ratingsChannelId) return false;
  if (message?.channelId !== ratingsChannelId) return false;
  if (message?.author?.id !== client.user?.id) return false;
  return Boolean(message?.embeds?.length);
}

/**
 * Who may comment: the roles listed in `ratingSystem.commentRoles`, plus anyone
 * with Administrator. An empty list falls back to the normal staff check, so the
 * feature works out of the box without forcing a config edit.
 * @returns {boolean}
 */
function canCommentFeedback(client, member) {
  if (!member) return false;
  if (member.permissions?.has('Administrator')) return true;

  const roles = client.config.ratingSystem?.commentRoles ?? [];
  if (roles.length > 0) {
    return roles.some(roleId => member.roles.cache.has(roleId));
  }

  return client.isStaff(member);
}

/** Field name for one commenter. One field per person, so a re-comment replaces it. */
function commentFieldName(client, member) {
  const name = member?.displayName || member?.user?.username || 'Team';
  return client.t('ratings.staffCommentField', { user: name }).slice(0, 256);
}

/** The commenter's current text, if they already commented on this message. */
function existingComment(embedData, fieldName) {
  return embedData?.fields?.find(f => f.name === fieldName)?.value ?? '';
}

/**
 * Add or replace this commenter's field on a plain embed object (`embed.toJSON()`
 * shape). Returns the fields array; throws nothing — a full embed silently keeps
 * its existing fields rather than losing the rating itself.
 */
function upsertComment(embedData, fieldName, text) {
  const fields = [...(embedData.fields ?? [])];
  const value  = text.slice(0, MAX_FIELD_VALUE);
  const index  = fields.findIndex(f => f.name === fieldName);

  if (index >= 0) {
    fields[index] = { name: fieldName, value, inline: false };
  } else if (fields.length < MAX_EMBED_FIELDS) {
    fields.push({ name: fieldName, value, inline: false });
  } else {
    return null; // caller reports "no room left"
  }

  return fields;
}

module.exports = {
  isRatingMessage,
  canCommentFeedback,
  commentFieldName,
  existingComment,
  upsertComment,
  MAX_EMBED_FIELDS,
  MAX_FIELD_VALUE,
};
