require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (process.env.GUILD_ID) {
      console.log(`Clearing guild-scoped commands from ${process.env.GUILD_ID}...`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: [] }
      );
      console.log('Guild commands cleared.');
    } else {
      console.log('ℹGUILD_ID not set - skipping guild clear.');
    }

    console.log('🧹 Clearing global commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log('Global commands cleared.');

    console.log('Done. Run `npm run deploy` next to register the current command set fresh.');
  } catch (err) {
    console.error('Clear failed:', err);
  }
})();