const { EmbedBuilder, Colors } = require('discord.js');

function parseColor(hex) {
  if (!hex || typeof hex !== 'string') return Colors.Blurple;
  const num = parseInt(hex.replace('#', ''), 16);
  return isNaN(num) ? Colors.Blurple : num;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts   = [];
  if (days)    parts.push(`${days}d`);
  if (hours)   parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.length ? parts.join(' ') : '<1m';
}

function panelEmbed(client) {
  return new EmbedBuilder()
    .setTitle(client.t('embeds.panel.title'))
    .setDescription(client.t('embeds.panel.description'))
    .setColor(parseColor(client.config.mainColor))
    .setTimestamp();
}

function ticketOpenedEmbed(client, { user, ticketType, priority, count, answers }) {
  const color         = parseColor(ticketType.color || client.config.mainColor);
  const priorityLabel = client.t(`priorities.${priority}`);

  let description = client.t('embeds.ticketOpened.description', {
    user:     `<@${user.id}>`,
    type:     ticketType.name,
    priority: priorityLabel,
  });

  const customDesc  = ticketType.customDescription?.trim();
  const hasAnswers  = ticketType.questions?.length > 0 && answers.length > 0;
  const hasReasonRefs = customDesc ? /REASON\d+/.test(customDesc) : false;

  if (customDesc) {
    if (hasAnswers && hasReasonRefs) {
      // Questions are defined → show only the intro text from customDescription,
      // strip lines that contain REASON placeholders to avoid duplicate display.
      // The answers will appear below as named fields using the question labels.
      const introText = customDesc
        .split('\n')
        .filter(line => !/REASON\d+/.test(line))
        .join('\n')
        .trim();

      if (introText) {
        const substituted = introText
          .replace(/USERNAME/g,    user.username)
          .replace(/USERID/g,      user.id)
          .replace(/TICKETCOUNT/g, String(count));
        description += `\n\n${substituted}`;
      }
    } else {
      // No questions defined → substitute REASON placeholders directly in the description
      let custom = customDesc
        .replace(/USERNAME/g,    user.username)
        .replace(/USERID/g,      user.id)
        .replace(/TICKETCOUNT/g, String(count));
      answers.forEach((ans, i) => {
        custom = custom.replace(new RegExp(`REASON${i + 1}`, 'g'), ans || '—');
      });
      description += `\n\n${custom}`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(client.t('embeds.ticketOpened.title'))
    .setDescription(description)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: `Ticket #${count} • ${ticketType.name}` });

  // Always show answers as fields when questions are defined
  if (hasAnswers) {
    ticketType.questions.forEach((q, i) => {
      if (answers[i]) embed.addFields({ name: q.label, value: answers[i], inline: false });
    });
  }

  return embed;
}

function ticketClosedEmbed(client, { closer, reason }) {
  return new EmbedBuilder()
    .setTitle(client.t('embeds.ticketClosed.title'))
    .setDescription(client.t('embeds.ticketClosed.description', {
      closer: `<@${closer.id}>`,
      reason: reason || 'Kein Grund angegeben',
    }))
    .setColor(Colors.Red)
    .setTimestamp();
}

function ticketClosedDMEmbed(client, { count, type, closer, reason, transcriptUrl }) {
  const embed = new EmbedBuilder()
    .setTitle(client.t('embeds.ticketClosedDM.title'))
    .setDescription(client.t('embeds.ticketClosedDM.description', {
      count:  String(count),
      type,
      closer: `<@${closer.id}>`,
      reason: reason || 'Kein Grund angegeben',
    }))
    .setColor(Colors.Red)
    .setTimestamp();

  if (transcriptUrl) {
    embed.addFields({ name: '📄 Transcript', value: `[Herunterladen](${transcriptUrl})`, inline: true });
  }
  return embed;
}

function ticketLogEmbed(client, { ticket, closer, reason, duration, transcriptUrl }) {
  const f = client.locale.embeds?.ticketLog?.fields ?? {};
  const embed = new EmbedBuilder()
    .setTitle(client.t('embeds.ticketLog.title', { count: String(ticket.id) }))
    .setColor(Colors.Orange)
    .setTimestamp()
    .addFields(
      { name: f.type    ?? 'Type',       value: ticket.type,               inline: true },
      { name: f.creator ?? 'Created by', value: `<@${ticket.creator_id}>`, inline: true },
      { name: f.closer  ?? 'Closed by',  value: `<@${closer.id}>`,         inline: true },
    );

  if (ticket.claimed_by) {
    embed.addFields({ name: f.claimed ?? 'Claimed by', value: `<@${ticket.claimed_by}>`, inline: true });
  }

  embed.addFields(
    { name: f.reason   ?? 'Reason',    value: reason || 'Kein Grund angegeben', inline: false },
    { name: f.duration ?? 'Duration',  value: formatDuration(duration),         inline: true  },
    { name: f.messages ?? 'Messages',  value: String(ticket.message_count ?? 0), inline: true },
  );

  if (transcriptUrl) {
    embed.addFields({ name: '📄 Transcript', value: `[Öffnen](${transcriptUrl})`, inline: true });
  }
  return embed;
}

function ratingRequestEmbed(client, { count }) {
  return new EmbedBuilder()
    .setTitle(client.t('embeds.ratingRequest.title'))
    .setDescription(client.t('embeds.ratingRequest.description', { count: String(count) }))
    .setColor(Colors.Yellow)
    .setTimestamp();
}

function statsEmbed(client, stats) {
  const f = client.locale.embeds?.stats?.fields ?? {};

  const avgRatingStr = stats.avgRating != null ? `${Number(stats.avgRating).toFixed(1)} ⭐` : '—';
  const topStaffStr  = stats.topStaff.length > 0
    ? stats.topStaff.map((s, i) => `${i + 1}. <@${s.closed_by}> (${s.count})`).join('\n')
    : '—';

  return new EmbedBuilder()
    .setTitle(client.t('embeds.stats.title'))
    .setColor(parseColor(client.config.mainColor))
    .setTimestamp()
    .addFields(
      { name: f.totalTickets  ?? 'Gesamt',     value: String(stats.total),               inline: true },
      { name: f.openTickets   ?? 'Offen',       value: String(stats.open),                inline: true },
      { name: f.closedTickets ?? 'Geschlossen', value: String(stats.closed),              inline: true },
      { name: f.avgRating     ?? 'Ø Bewertung', value: avgRatingStr,                      inline: true },
      { name: f.avgDuration   ?? 'Ø Dauer',     value: formatDuration(stats.avgDuration), inline: true },
      { name: f.topStaff      ?? 'Top Staff',   value: topStaffStr,                       inline: false },
    );
}

function userStatsEmbed(client, user, stats) {
  const embed = new EmbedBuilder()
    .setTitle(`📊 Statistiken — ${user.displayName ?? user.username}`)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 64 }))
    .setColor(parseColor(client.config.mainColor))
    .setTimestamp();

  const avgRatingGiven = stats.ratingsGiven != null
    ? `${Number(stats.ratingsGiven).toFixed(1)} ⭐ (${stats.ratingsGivenCount}x)`
    : '—';

  embed.addFields(
    { name: '\u200b',                  value: '**👤 Als Nutzer**',           inline: false },
    { name: '🎫 Tickets eröffnet',     value: String(stats.opened),          inline: true  },
    { name: '🟢 Davon offen',          value: String(stats.openNow),         inline: true  },
    { name: '🔴 Davon geschlossen',    value: String(stats.closedAsCreator), inline: true  },
    { name: '🏷️ Häufigster Typ',       value: stats.favoriteType ?? '—',     inline: true  },
    { name: '⭐ Ø Bewertung gegeben',  value: avgRatingGiven,                inline: true  },
  );

  const hasStaffActivity = stats.closedAsStaff > 0 || stats.claimed > 0;
  if (hasStaffActivity) {
    const avgStaffRating = stats.staffRating != null
      ? `${Number(stats.staffRating).toFixed(1)} ⭐ (${stats.staffRatingCount}x)`
      : '—';

    embed.addFields(
      { name: '\u200b',                   value: '**🛡️ Als Staff**',          inline: false },
      { name: '🔒 Tickets geschlossen',   value: String(stats.closedAsStaff), inline: true  },
      { name: '🙋 Tickets beansprucht',   value: String(stats.claimed),       inline: true  },
      { name: '⭐ Ø Bewertung erhalten',  value: avgStaffRating,              inline: true  },
    );
  }

  return embed;
}

module.exports = {
  parseColor,
  formatDuration,
  panelEmbed,
  ticketOpenedEmbed,
  ticketClosedEmbed,
  ticketClosedDMEmbed,
  ticketLogEmbed,
  ratingRequestEmbed,
  statsEmbed,
  userStatsEmbed,
};
