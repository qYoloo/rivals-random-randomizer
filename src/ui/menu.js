const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MENU_COLOR = '#FA5C5C';


function currentRoundLines(state) {
  if (!state.roundCounter) return null;
  const lines = [];
  for (const player of state.players) {
    const entries = state.history[player.id] || [];
    const entry = entries.find((e) => e.round === state.roundCounter);
    if (!entry) continue;
    const tag = entry.manual ? '   ' : entry.respun ? ' * ' : '';
    lines.push(`<@${player.id}> - **${entry.role}**: ${entry.hero}${tag}`);
  }
  return lines.length ? lines.join('\n') : null;
}

function buildMenuEmbed(state, notice) {
  const totalPlayers = state.players?.length || 0;

  const embed = new EmbedBuilder()
    .setColor(notice?.color ?? MENU_COLOR)
    .setTitle("Yoloo's Fantastic Randomizer")
    .addFields({
      name: 'Players',
      value: totalPlayers
        ? state.players.map((p) => `<@${p.id}>`).join(', ')
        : "None set - Press `Set Players`.",
    });

  const board = currentRoundLines(state);
  embed.addFields({
    name: `Round ${state.roundCounter || 0}`,
    value: board ?? 'No round rolled yet',
  });

  if (notice?.text) {
    embed.setDescription(notice.text);
  }

  return embed;
}

function buildMenuRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu:roll').setLabel('Roll Next Round').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('menu:respin_same').setLabel('Respin (same class)').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu:respin_any').setLabel('Respin (any class)').setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu:sethero').setLabel('Set My Hero').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('menu:profile').setLabel('My Profile').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('menu:sessionstats').setLabel('Session Stats').setStyle(ButtonStyle.Secondary),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu:setplayers').setLabel('Set Players').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('menu:undo').setLabel('Undo Last Round').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('menu:reset').setLabel('End Session').setStyle(ButtonStyle.Danger),
  );
  return [row1, row2, row3];
}

module.exports = { buildMenuEmbed, buildMenuRows, currentRoundLines, MENU_COLOR };
