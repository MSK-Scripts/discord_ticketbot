/**
 * Startup permission check.
 *
 * Without this the bot starts up looking perfectly healthy and then fails on the
 * FIRST ticket with a bare `DiscordAPIError[50013]: Missing Permissions` — a 403
 * that names neither the missing permission nor how to fix it. The operator has
 * no way to know what went wrong.
 *
 * Two of these are easy to get wrong and worth calling out:
 *
 *  • Manage Roles is needed to set channel permission overwrites at all.
 *  • Manage Messages is needed because the bot GRANTS that permission to staff in
 *    the ticket's overwrites — Discord only lets you hand out permissions you
 *    hold yourself. It is required even though the bot never deletes a message.
 */

const { PermissionFlagsBits } = require('discord.js');

/** Permissions the bot cannot do its job without. */
const REQUIRED = [
  ['ViewChannel',        'see channels'],
  ['SendMessages',       'write in tickets'],
  ['EmbedLinks',         'send embeds'],
  ['AttachFiles',        'attach transcripts'],
  ['ReadMessageHistory', 'read ticket history (needed for transcripts)'],
  ['ManageChannels',     'create, rename and move ticket channels'],
  ['ManageRoles',        'set who can see a ticket (permission overwrites)'],
  ['ManageMessages',     'grant staff message management inside tickets'],
];

/** Only needed for specific features — a warning, not an error. */
const OPTIONAL = [
  ['ManageWebhooks', 'let users reply from the web dashboard under their own name'],
];

const BITFIELD = [...REQUIRED, ...OPTIONAL]
  .reduce((acc, [name]) => acc | PermissionFlagsBits[name], 0n);

/** The invite URL that grants everything in one go. */
const inviteUrl = (clientId) =>
  `https://discord.com/oauth2/authorize?client_id=${clientId}` +
  `&permissions=${BITFIELD}&scope=bot%20applications.commands`;

/**
 * Check the bot's guild-level permissions and report anything missing.
 * Never throws and never exits: a missing permission is worth shouting about,
 * but it must not stop a bot that may still be perfectly usable.
 *
 * @returns {{ missing: string[], missingOptional: string[] }}
 */
function checkBotPermissions(client) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return { missing: [], missingOptional: [] };

  const me = guild.members.me;
  if (!me) return { missing: [], missingOptional: [] };

  // Administrator implies everything, so there is nothing to complain about.
  if (me.permissions.has(PermissionFlagsBits.Administrator)) {
    return { missing: [], missingOptional: [] };
  }

  const missing = REQUIRED.filter(([name]) => !me.permissions.has(PermissionFlagsBits[name]));
  const missingOptional = OPTIONAL.filter(([name]) => !me.permissions.has(PermissionFlagsBits[name]));

  if (missing.length > 0) {
    client.logger.error('[Permissions] The bot is missing permissions it NEEDS:');
    for (const [name, why] of missing) {
      client.logger.error(`[Permissions]   ✗ ${name} — required to ${why}`);
    }
    client.logger.error('[Permissions] Ticket creation will fail with "Missing Permissions" (50013).');
    client.logger.error('[Permissions] Fix it by re-inviting the bot with the right permissions:');
    client.logger.error(`[Permissions]   ${inviteUrl(process.env.CLIENT_ID)}`);
    client.logger.error('[Permissions] (Re-inviting does not remove the bot or lose any data.)');
  }

  for (const [name, why] of missingOptional) {
    client.logger.warn(`[Permissions] ${name} is missing — needed to ${why}.`);
  }

  // The bot's role must sit ABOVE any staff role it writes an overwrite for.
  const staffRoles = new Set(client.config.rolesWhoHaveAccessToTheTickets ?? []);
  for (const type of client.config.ticketTypes ?? []) {
    for (const id of type.staffRoles ?? []) staffRoles.add(id);
  }
  for (const roleId of staffRoles) {
    const role = guild.roles.cache.get(roleId);
    if (role && role.position >= me.roles.highest.position) {
      client.logger.warn(
        `[Permissions] The bot's role is not above "${role.name}" — Discord may refuse to ` +
        'set permissions for it. Drag the bot\'s role higher in Server Settings → Roles.',
      );
    }
  }

  if (missing.length === 0 && missingOptional.length === 0) {
    client.logger.info('[Permissions] All required permissions are present.');
  }

  return {
    missing: missing.map(([n]) => n),
    missingOptional: missingOptional.map(([n]) => n),
  };
}

module.exports = { checkBotPermissions, inviteUrl, REQUIRED, OPTIONAL, BITFIELD };
