/**
 * Button: tb_rate (prefix match, e.g. tb_rate:3)
 * Handles the 1–5 star rating after a ticket is closed.
 */
const { getRating, addRating } = require('../../database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  customId: 'tb_rate',

  async execute(client, interaction) {
    const ratingStr = interaction.customId.split(':')[1];
    const rating    = parseInt(ratingStr, 10);

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return interaction.reply({ content: '❌ Ungültige Bewertung.', ephemeral: true });
    }

    // Parse ticket ID from the embed description (#42)
    let ticketId = null;
    const embed = interaction.message?.embeds?.[0];
    if (embed?.description) {
      const match = embed.description.match(/#(\d+)/);
      if (match) ticketId = parseInt(match[1], 10);
    }

    if (!ticketId) {
      return interaction.reply({ content: '❌ Ticket-Referenz nicht gefunden.', ephemeral: true });
    }

    const existing = getRating(ticketId);
    if (existing) {
      return interaction.reply({ content: '✅ Du hast dieses Ticket bereits bewertet.', ephemeral: true });
    }

    addRating(ticketId, interaction.user.id, rating, null);

    const label = client.t(`ratings.${rating}`);

    // Update the rating message — remove buttons, confirm to the user
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

    // Post rating to the dedicated ratings channel
    const ratingCfg = client.config.ratingSystem;
    const ratingsChannelId = ratingCfg?.ratingsChannelId;

    if (ratingsChannelId) {
      const ratingsChannel = await client.channels.fetch(ratingsChannelId).catch(() => null);
      if (ratingsChannel) {
        await ratingsChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`⭐ Neue Bewertung — Ticket #${ticketId}`)
              .addFields(
                { name: 'Nutzer',     value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Bewertung',  value: label,                       inline: true },
              )
              .setColor(0xfee75c)
              .setTimestamp(),
          ],
        }).catch(err => {
          client.logger.warn(`[Rating] Could not post to ratings channel: ${err.message}`);
        });
      } else {
        client.logger.warn(`[Rating] ratingsChannelId "${ratingsChannelId}" not found.`);
      }
    }
  },
};
