/**
 * Modal: tb_modalRate:{rating}:{ticketId}
 * Submitted after the user picked a star rating and (optionally) wrote a comment.
 */
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { getRating, addRating, getTicketById } = require('../../database');

module.exports = {
  customId: 'tb_modalRate',

  async execute(client, interaction) {
    const [, ratingStr, ticketIdStr] = interaction.customId.split(':');
    const rating   = parseInt(ratingStr,   10);
    const ticketId = parseInt(ticketIdStr, 10);

    if (isNaN(rating) || rating < 1 || rating > 5 || isNaN(ticketId)) {
      return interaction.reply({ content: client.t('messages.notInvalidRating'), flags: MessageFlags.Ephemeral });
    }

    if (await getRating(ticketId)) {
      return interaction.reply({ content: client.t('messages.alreadyRated'), flags: MessageFlags.Ephemeral });
    }

    const rawComment = interaction.fields.getTextInputValue('rate_comment')?.trim();
    const comment    = rawComment ? rawComment : null;

    await addRating(ticketId, interaction.user.id, rating, comment);

    const label = client.t(`ratings.${rating}`);

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle(client.t('embeds.ratingReceived.title'))
          .setDescription(client.t('embeds.ratingReceived.description', { label }))
          .setColor(0x57f287)
          .setTimestamp(),
      ],
      components: [],
    }).catch(() => null);

    const ratingsChannelId = client.config.ratingSystem?.ratingsChannelId;
    if (ratingsChannelId) {
      const ratingsChannel = await client.channels.fetch(ratingsChannelId).catch(() => null);
      if (ratingsChannel) {
        // The ticket carries the type; the config carries its display name. A ticket
        // whose type was removed from the config still has to render, so fall back
        // to the raw code name instead of dropping the field.
        const ticket      = await getTicketById(ticketId).catch(() => null);
        const ticketType  = ticket
          ? client.config.ticketTypes?.find(t => t.codeName === ticket.type)
          : null;
        const categoryName = ticketType?.name || ticket?.type || null;

        const embed = new EmbedBuilder()
          .setTitle(client.t('embeds.ratingPost.title', { count: String(ticketId) }))
          .addFields(
            { name: client.t('embeds.ratingPost.userField'),   value: `<@${interaction.user.id}>`, inline: true },
            { name: client.t('embeds.ratingPost.ratingField'), value: label,                       inline: true },
          )
          .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
          .setColor(0xfee75c)
          .setTimestamp();

        if (categoryName) {
          embed.addFields({
            name:   client.t('embeds.ratingPost.categoryField'),
            value:  categoryName,
            inline: true,
          });
        }

        if (comment) {
          embed.addFields({ name: client.t('ratings.commentField'), value: comment, inline: false });
        }

        await ratingsChannel.send({ embeds: [embed] })
          .catch(err => client.logger.warn(`[Rating] Could not post: ${err.message}`));
      } else {
        client.logger.warn(`[Rating] ratingsChannelId "${ratingsChannelId}" not found.`);
      }
    }
  },
};
