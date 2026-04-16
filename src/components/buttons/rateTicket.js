const { EmbedBuilder, MessageFlags } = require('discord.js');
const { getRating, addRating } = require('../../database');

module.exports = {
  customId: 'tb_rate',

  async execute(client, interaction) {
    const rating = parseInt(interaction.customId.split(':')[1], 10);

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return interaction.reply({ content: '❌ Ungültige Bewertung.', flags: MessageFlags.Ephemeral });
    }

    let ticketId = null;
    const embed = interaction.message?.embeds?.[0];
    if (embed?.description) {
      const match = embed.description.match(/#(\d+)/);
      if (match) ticketId = parseInt(match[1], 10);
    }

    if (!ticketId) {
      return interaction.reply({ content: '❌ Ticket-Referenz nicht gefunden.', flags: MessageFlags.Ephemeral });
    }

    if (getRating(ticketId)) {
      return interaction.reply({ content: '✅ Du hast dieses Ticket bereits bewertet.', flags: MessageFlags.Ephemeral });
    }

    addRating(ticketId, interaction.user.id, rating, null);

    const label = client.t(`ratings.${rating}`);

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Bewertung erhalten')
          .setDescription(`Danke für dein Feedback! Du hast **${label}** gegeben.`)
          .setColor(0x57f287)
          .setTimestamp(),
      ],
      components: [],
    }).catch(() => null);

    const ratingsChannelId = client.config.ratingSystem?.ratingsChannelId;
    if (ratingsChannelId) {
      const ratingsChannel = await client.channels.fetch(ratingsChannelId).catch(() => null);
      if (ratingsChannel) {
        await ratingsChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`⭐ Neue Bewertung — Ticket #${ticketId}`)
              .addFields(
                { name: 'Nutzer',    value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Bewertung', value: label,                       inline: true },
              )
              .setColor(0xfee75c)
              .setTimestamp(),
          ],
        }).catch(err => client.logger.warn(`[Rating] Could not post: ${err.message}`));
      } else {
        client.logger.warn(`[Rating] ratingsChannelId "${ratingsChannelId}" not found.`);
      }
    }
  },
};
