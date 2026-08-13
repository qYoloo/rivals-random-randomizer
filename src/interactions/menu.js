const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const { getGuildState, saveGuildState } = require('../utils/storage');
const { generateRound, respin, setHero, latestEntry, resetRounds, getProfileStats, mergeSessionIntoLifetime } = require('../utils/randomizer');
const { findHeroByName, ROLE_COLORS } = require('../data/heroes');
const { getHeroImageAttachment } = require('../utils/heroImages');
const { buildMenuEmbed, buildMenuRows, MENU_COLOR } = require('../ui/menu');

const MAX_PLAYERS = 6;

function storageIdFor(interaction) {
  return interaction.guildId || interaction.user.id;
}

const REQUIRES_ROSTER_MEMBERSHIP = new Set([
  'menu:roll',
  'menu:respin_same',
  'menu:respin_any',
  'menu:sethero',
  'menu:profile',
  'menu:sessionstats',
]);

async function ephemeral(interaction, content) {
  await interaction.reply({ content, ephemeral: true });
}

async function refreshMainMenu(interaction, state, notice) {
  await interaction.update({ embeds: [buildMenuEmbed(state, notice)], components: buildMenuRows() });
}

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith('menu:reset_confirm:') || id.startsWith('menu:reset_cancel:')) {
    return handleResetConfirmation(interaction);
  }

  if (id.startsWith('menu:resetprofile:')) {
    return handleResetProfileButton(interaction);
  }

  const storageId = storageIdFor(interaction);
  const state = getGuildState(storageId);

  if (REQUIRES_ROSTER_MEMBERSHIP.has(id)) {
    const isPlayer = state.players?.some((p) => p.id === interaction.user.id);
    if (!isPlayer) {
      await ephemeral(interaction, "No active players, do 'Set Players' first.");
      return;
    }
  }

  switch (id) {
    case 'menu:roll':
      return handleRoll(interaction, state, storageId);
    case 'menu:respin_same':
      return handleRespin(interaction, state, storageId, false);
    case 'menu:respin_any':
      return handleRespin(interaction, state, storageId, true);
    case 'menu:sethero':
      return handleSetHeroModal(interaction);
    case 'menu:profile':
      return handleProfile(interaction, state);
    case 'menu:sessionstats':
      return handleSessionStats(interaction, state);
    case 'menu:setplayers':
      return handleSetPlayers(interaction);
    case 'menu:undo':
      return handleUndo(interaction, state, storageId);
    case 'menu:reset':
      return handleResetPrompt(interaction);
    default:
      return;
  }
}

async function handleRoll(interaction, state, storageId) {
  if (state.players.length === 0) {
    await ephemeral(interaction, 'No players set yet. Click `Set Players` first.');
    return;
  }
  try {
    generateRound(state);
  } catch (err) {
    await ephemeral(interaction, err.message);
    return;
  }
  saveGuildState(storageId, state);
  await refreshMainMenu(interaction, state);
}

async function handleRespin(interaction, state, storageId, ignoreClass) {
  const before = latestEntry(state, interaction.user.id);
  if (!before) {
    await ephemeral(interaction, "You don't have a hero this round yet. Click `Roll Next Round` first.");
    return;
  }
  respin(state, interaction.user.id, ignoreClass);
  saveGuildState(storageId, state);
  await refreshMainMenu(interaction, state);
}

async function handleSetHeroModal(interaction) {
  const modal = new ModalBuilder().setCustomId('menu:sethero_modal').setTitle('Set your hero');

  const input = new TextInputBuilder()
    .setCustomId('hero_name')
    .setLabel('Hero name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Luna Snow')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleProfile(interaction, state) {
  const target = interaction.user;
  const stats = getProfileStats(state, target.id);

  if (stats.roundsPlayed === 0) {
    await ephemeral(interaction, "You haven't played any rounds yet.");
    return;
  }

  const favoriteHero = findHeroByName(stats.favoriteHero);
  const color = MENU_COLOR;

  const roleBreakdown =
    Object.entries(stats.roleCounts)
      .map(([role, count]) => `${role}: ${count}`)
      .join('\n') || 'None';

  const recent = stats.recent
    .slice(-5)
    .reverse()
    .map((e) => {
      const tag = e.manual ? ' (manual)' : e.respun ? ' (respun)' : '';
      return `${e.role} - ${e.hero}${tag}`;
    })
    .join('\n');

  const { EmbedBuilder } = require('discord.js');
  const embed = new EmbedBuilder()
    .setTitle(`${target.username}'s Profile`)
    .setColor(color)
    .addFields(
      { name: 'Rounds Played', value: `${stats.roundsPlayed}`, inline: true },
      { name: 'Favorite Hero', value: `${stats.favoriteHero} (${stats.favoriteCount}x)`, inline: true },
      { name: 'Role Breakdown', value: roleBreakdown },
      { name: 'Recent Rounds', value: recent },
    );

  const files = [];
  const heroImage = getHeroImageAttachment(stats.favoriteHero);
  if (heroImage) {
    files.push(heroImage.attachment);
    embed.setThumbnail(heroImage.url);
  }

  const resetRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`menu:resetprofile:${interaction.message.id}`)
      .setLabel('Reset My Profile')
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.reply({ embeds: [embed], files, components: [resetRow], ephemeral: true });
}

async function handleSessionStats(interaction, state) {
  const { EmbedBuilder } = require('discord.js');
  const MAX_FIELDS = 25;

  if (state.players.length === 0 || state.roundCounter === 0) {
    await ephemeral(interaction, 'No rounds played yet.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Session stats - ${state.roundCounter} round(s), ${state.players.length} player(s)`)
    .setColor(MENU_COLOR);

  const rounds = [];
  for (let r = 1; r <= state.roundCounter; r++) {
    const lines = [];
    for (const player of state.players) {
      const entry = (state.history[player.id] || []).find((e) => e.round === r);
      if (!entry) continue;
      const tag = entry.manual ? ' (manual)' : entry.respun ? ' (respun)' : '';
      lines.push(`**${player.name}** - ${entry.role}: ${entry.hero}${tag}`);
    }
    if (lines.length > 0) rounds.push({ round: r, lines });
  }

  const shown = rounds.slice(-MAX_FIELDS);
  if (shown.length < rounds.length) {
    embed.setDescription(`Showing the most recent ${MAX_FIELDS} rounds.`);
  }
  for (const r of shown) {
    embed.addFields({ name: `Round ${r.round}`, value: r.lines.join('\n') });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleResetProfileButton(interaction) {
  const [, , mainMessageId] = interaction.customId.split(':');
  const storageId = storageIdFor(interaction);
  const state = getGuildState(storageId);

  const hasSessionHistory = state.history[interaction.user.id]?.length > 0;
  const hasLifetimeStats = (state.lifetimeStats[interaction.user.id]?.roundsPlayed || 0) > 0;
  if (!hasSessionHistory && !hasLifetimeStats) {
    await interaction.update({ content: "You don't have any stats to reset.", embeds: [], components: [], files: [] });
    return;
  }

  delete state.history[interaction.user.id];
  delete state.lifetimeStats[interaction.user.id];
  saveGuildState(storageId, state);

  await interaction.update({ content: 'Your profile has been reset.', embeds: [], components: [], files: [] });

  try {
    const channel = interaction.channel ?? (await interaction.client.channels.fetch(interaction.channelId));
    const mainMessage = await channel.messages.fetch(mainMessageId);
    await mainMessage.edit({ embeds: [buildMenuEmbed(state)], components: buildMenuRows() });
  } catch (err) {
    console.error('Could not refresh main menu after profile reset:', err);
    await interaction.followUp({
      content: "Your profile was reset, but I couldn't refresh the main menu message.",
      ephemeral: true,
    });
  }
}

async function handleUndo(interaction, state, storageId) {
  if (state.roundCounter === 0) {
    await ephemeral(interaction, 'No rounds to undo yet.');
    return;
  }
  resetRounds(state, 1);
  saveGuildState(storageId, state);
  await refreshMainMenu(interaction, state);
}

function toPlayerRecord(member) {
  return {
    id: member.id,
    name: member.displayName,
    username: member.user.tag,
    avatarURL: member.displayAvatarURL(),
  };
}

function diffPlayers(oldPlayers, newPlayers) {
  const oldIds = new Set(oldPlayers.map((p) => p.id));
  const newIds = new Set(newPlayers.map((p) => p.id));
  const removed = oldPlayers.filter((p) => !newIds.has(p.id));
  const added = newPlayers.filter((p) => !oldIds.has(p.id));
  return { removed, added };
}

function buildSwapNotice(removed, added) {
  if (removed.length === 0 && added.length === 0) return null;

  const lines = [];
  const pairCount = Math.min(removed.length, added.length);
  for (let i = 0; i < pairCount; i++) {
    lines.push(`<@${removed[i].id}> swapped out for <@${added[i].id}>`);
  }
  for (let i = pairCount; i < removed.length; i++) {
    lines.push(`<@${removed[i].id}> removed`);
  }
  for (let i = pairCount; i < added.length; i++) {
    lines.push(`<@${added[i].id}> added`);
  }

  return { color: MENU_COLOR, text: lines.join('\n') };
}

async function handleSetPlayers(interaction) {
  const channel = interaction.member.voice?.channel;

  if (!channel) {
    await ephemeral(interaction, 'Join a voice channel first, then click **Set Players** again.');
    return;
  }

  const voiceMembers = [...channel.members.filter((m) => !m.user.bot).values()];
  if (voiceMembers.length === 0) {
    await ephemeral(interaction, `No non-bot members found in **${channel.name}**.`);
    return;
  }

  const options = voiceMembers
    .slice(0, 25)
    .map((m) => new StringSelectMenuOptionBuilder().setLabel(m.displayName).setValue(m.id));

  const stringSelect = new StringSelectMenuBuilder()
    .setCustomId('players')
    .setMinValues(1)
    .setMaxValues(Math.min(MAX_PLAYERS, options.length))
    .addOptions(options);

  const label = new LabelBuilder()
    .setLabel(`Select up to ${MAX_PLAYERS} players`)
    .setDescription(`From ${channel.name} - won't let you pick more than that`)
    .setStringSelectMenuComponent(stringSelect);

  const modal = new ModalBuilder()
    .setCustomId('menu:setplayers_modal')
    .setTitle('Set Players')
    .addLabelComponents(label);

  await interaction.showModal(modal);
}

async function handleSetPlayersModalSubmit(interaction) {
  const storageId = storageIdFor(interaction);
  const state = getGuildState(storageId);

  const selectedIds = interaction.fields.getStringSelectValues('players');
  const members = await Promise.all(
    selectedIds.map((id) => interaction.guild.members.fetch(id).catch(() => null)),
  );
  const selected = members.filter(Boolean).filter((m) => !m.user.bot);

  if (selected.length === 0) {
    await ephemeral(interaction, 'No valid (non-bot) members were selected. Nothing changed.');
    return;
  }

  const { removed, added } = diffPlayers(state.players, selected.map(toPlayerRecord));
  state.players = selected.map(toPlayerRecord);
  saveGuildState(storageId, state);
  const notice = buildSwapNotice(removed, added);

  await interaction.update({ embeds: [buildMenuEmbed(state, notice)], components: buildMenuRows() });
}

async function handleResetPrompt(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`menu:reset_confirm:${interaction.message.id}`)
      .setLabel('Confirm end session')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`menu:reset_cancel:${interaction.message.id}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),
  );
  await interaction.reply({
    content: 'This ends the session and clears the player roster. Your stats are saved - are you sure?',
    components: [row],
    ephemeral: true,
  });
}

async function handleResetConfirmation(interaction) {
  const [, action, messageId] = interaction.customId.split(':');
  const confirmed = action === 'reset_confirm';

  if (!confirmed) {
    await interaction.update({ content: 'Cancelled - nothing was changed.', components: [] });
    return;
  }

  const storageId = storageIdFor(interaction);
  const state = getGuildState(storageId);

  const roundsThisSession = state.roundCounter;
  mergeSessionIntoLifetime(state);
  state.players = [];
  state.roundCounter = 0;
  state.history = {};
  saveGuildState(storageId, state);

  await interaction.update({ content: 'Session ended.', components: [] });

  const roundLabel = roundsThisSession === 1 ? 'round' : 'rounds';
  try {
    const channel = interaction.channel ?? (await interaction.client.channels.fetch(interaction.channelId));
    const mainMessage = await channel.messages.fetch(messageId);
    await mainMessage.edit({
      content: `Session ended - ${roundsThisSession} total ${roundLabel} played.`,
      embeds: [],
      components: [],
    });
  } catch (err) {
    console.error('Could not update main menu message after ending session:', err);
    await interaction.followUp({
      content: "Session data was saved, but I couldn't update the original menu message. You can delete it manually.",
      ephemeral: true,
    });
  }
}

async function handleModal(interaction) {
  if (interaction.customId === 'menu:setplayers_modal') {
    return handleSetPlayersModalSubmit(interaction);
  }

  if (interaction.customId !== 'menu:sethero_modal') return;

  const storageId = storageIdFor(interaction);
  const state = getGuildState(storageId);

  const before = latestEntry(state, interaction.user.id);
  if (!before) {
    await ephemeral(interaction, "You don't have a hero this round yet. Click **Roll Next Round** first.");
    return;
  }

  const heroInput = interaction.fields.getTextInputValue('hero_name');
  const hero = findHeroByName(heroInput);
  if (!hero) {
    await ephemeral(interaction, `Couldn't find a hero matching "${heroInput}".`);
    return;
  }

  setHero(state, interaction.user.id, hero);
  saveGuildState(storageId, state);

  await interaction.update({ embeds: [buildMenuEmbed(state)], components: buildMenuRows() });
}

module.exports = { handleButton, handleModal };