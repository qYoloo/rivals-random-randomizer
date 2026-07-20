const { SlashCommandBuilder } = require('discord.js');
const { getGuildState } = require('../utils/storage');
const { buildMenuEmbed, buildMenuRows } = require('../ui/menu');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rivals')
    .setDescription('Open the Randomizer menu'),

  async execute(interaction) {
    const storageId = interaction.guildId || interaction.user.id;
    const state = getGuildState(storageId);
    await interaction.reply({ embeds: [buildMenuEmbed(state)], components: buildMenuRows() });
  },
};
